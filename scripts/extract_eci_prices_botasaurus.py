import json
import os
import re
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import firebase_admin
from botasaurus.browser import browser
from firebase_admin import credentials, firestore


ROOT = Path(__file__).resolve().parents[1]
SERVICE_ACCOUNT_PATH = ROOT / 'serviceAccountKey.json'
REPORT_PATH = ROOT / 'scripts' / 'cafes-eci-botasaurus-report.json'

APPLY = os.getenv('APPLY', '').lower() == 'true'
HEADLESS = os.getenv('HEADLESS', 'true').lower() != 'false'
USE_HTTP_FALLBACK = os.getenv('USE_HTTP_FALLBACK', 'true').lower() != 'false'
SOURCE_FILTER = os.getenv('SOURCE_FILTER', 'club del gourmet').strip().lower()
WAIT_SECONDS = max(0, int(os.getenv('WAIT_SECONDS', '4')))
LIMIT = int(os.getenv('LIMIT', '0') or '0')
INCLUDE_PRICED = os.getenv('INCLUDE_PRICED', '').lower() == 'true'


def normalize_text(value: Any) -> str:
    return re.sub(r'\s+', ' ', str(value or '')).strip()


def parse_price(value: Any) -> float | None:
    raw = normalize_text(value)
    if not raw:
        return None

    cleaned = re.sub(r'[^\d,.-]', '', raw)
    if not cleaned:
        return None

    if ',' in cleaned and '.' in cleaned:
        cleaned = cleaned.replace('.', '').replace(',', '.')
    elif ',' in cleaned:
        cleaned = cleaned.replace(',', '.')

    try:
        parsed = round(float(cleaned), 2)
    except ValueError:
        return None

    if parsed < 1 or parsed > 500:
        return None
    return parsed


def extract_eci_price(html: str, text: str = '') -> dict[str, Any] | None:
    patterns = [
        (
            'eci_offer_jsonld',
            re.compile(
                r'"offers"\s*:\s*\{[\s\S]{0,800}?"priceCurrency"\s*:\s*"([A-Z]{3})"[\s\S]{0,200}?"price"\s*:\s*(\d+(?:[.,]\d+)?)',
                re.I,
            ),
        ),
        (
            'eci_meta_price',
            re.compile(r'product:price:amount["\']?\s*content=["\'](\d+(?:[.,]\d+)?)["\']', re.I),
        ),
        (
            'eci_visible_price',
            re.compile(r'(\d+(?:[.,]\d{1,2})?)\s*€'),
        ),
    ]

    for source, pattern in patterns:
        match = pattern.search(html)
        if match:
            if source == 'eci_offer_jsonld':
                price = parse_price(match.group(2))
                currency = normalize_text(match.group(1) or 'EUR') or 'EUR'
            else:
                price = parse_price(match.group(1))
                currency = 'EUR'
            if price:
                return {'price': price, 'currency': currency, 'source': source}

    text_match = re.search(r'(\d+(?:[.,]\d{1,2})?)\s*€', text)
    if text_match:
        price = parse_price(text_match.group(1))
        if price:
            return {'price': price, 'currency': 'EUR', 'source': 'eci_visible_text'}

    return None


def fetch_http_html(url: str) -> str:
    request = Request(
        url,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        },
    )
    with urlopen(request, timeout=20) as response:
        return response.read().decode('utf-8', errors='replace')


@browser(
    headless=HEADLESS,
    output=None,
    raise_exception=False,
    wait_for_complete_page_load=False,
    create_error_logs=False,
)
def fetch_with_botasaurus(driver, url: str):
    driver.get(url)
    if WAIT_SECONDS:
        driver.sleep(WAIT_SECONDS)

    html = driver.page_html or ''
    text = ''
    title = ''
    current_url = url

    try:
        text = driver.page_text or ''
    except Exception:
        text = ''

    try:
        title = driver.title or ''
    except Exception:
        title = ''

    try:
        current_url = driver.current_url or url
    except Exception:
        current_url = url

    return {
        'url': current_url,
        'title': title,
        'html': html,
        'text': text,
    }


def ensure_firestore() -> firestore.Client:
    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.Certificate(str(SERVICE_ACCOUNT_PATH)))
    return firestore.client()


def load_target_cafes(db: firestore.Client) -> list[dict[str, Any]]:
    snapshot = db.collection('cafes').get()
    cafes = []
    unresolved = []
    for doc in snapshot:
        data = doc.to_dict() or {}
        source = normalize_text(data.get('fuente', '')).lower()
        url = normalize_text(data.get('fuenteUrl') or data.get('urlProducto') or '')
        if data.get('legacy') is True:
            continue

        has_price = False
        if data.get('precio') not in (None, ''):
            try:
                has_price = float(data.get('precio')) > 0
            except Exception:
                has_price = False

        if SOURCE_FILTER and SOURCE_FILTER not in source:
            continue
        if 'elcorteingles.es' not in url:
            continue

        entry = {
            'id': doc.id,
            'nombre': data.get('nombre') or data.get('name') or '',
            'marca': data.get('roaster') or data.get('marca') or '',
            'fuente': data.get('fuente') or '',
            'url': url,
            'precioActual': data.get('precio'),
        }
        cafes.append(entry)
        if not has_price:
            unresolved.append(entry)

    chosen = cafes if INCLUDE_PRICED else unresolved
    if not chosen and not APPLY:
        chosen = cafes

    return chosen[:LIMIT] if LIMIT > 0 else chosen


def enrich_one(cafe: dict[str, Any]) -> dict[str, Any]:
    result = {
        'id': cafe['id'],
        'nombre': cafe['nombre'],
        'marca': cafe['marca'],
        'fuente': cafe['fuente'],
        'url': cafe['url'],
        'ok': False,
        'price': None,
        'currency': None,
        'source': None,
        'botasaurusHtmlLength': None,
        'botasaurusTitle': None,
        'fallbackUsed': False,
        'reason': 'price_not_found',
    }

    try:
        browser_data = fetch_with_botasaurus(cafe['url'])
        html = normalize_text(browser_data.get('html', ''))
        text = normalize_text(browser_data.get('text', ''))
        result['botasaurusHtmlLength'] = len(html)
        result['botasaurusTitle'] = browser_data.get('title') or ''

        extracted = extract_eci_price(html, text)
        if extracted:
          result.update({
              'ok': True,
              'price': extracted['price'],
              'currency': extracted['currency'],
              'source': f"botasaurus:{extracted['source']}",
              'reason': None,
          })
          return result
    except Exception as error:
        result['reason'] = f'botasaurus_error: {error}'

    if USE_HTTP_FALLBACK:
        try:
            html = fetch_http_html(cafe['url'])
            extracted = extract_eci_price(html)
            if extracted:
                result.update(
                    {
                        'ok': True,
                        'price': extracted['price'],
                        'currency': extracted['currency'],
                        'source': f"http_fallback:{extracted['source']}",
                        'fallbackUsed': True,
                        'reason': None,
                    }
                )
                return result
            result['fallbackUsed'] = True
        except (HTTPError, URLError, TimeoutError) as error:
            result['reason'] = f'http_fallback_error: {error}'

    return result


def main() -> int:
    db = ensure_firestore()
    cafes = load_target_cafes(db)
    print(f'[ECI-BOT] Target cafes: {len(cafes)}')

    results = []
    found = 0
    applied = 0

    for cafe in cafes:
        entry = enrich_one(cafe)
        results.append(entry)
        if not entry['ok']:
            print(f"[ECI-BOT] Missing: {cafe['id']} -> {entry['reason']}")
            continue

        found += 1
        print(f"[ECI-BOT] Found: {cafe['nombre']} -> {entry['price']} {entry['currency']} ({entry['source']})")

        if APPLY:
            db.collection('cafes').document(cafe['id']).set(
                {
                    'precio': entry['price'],
                    'currency': entry['currency'],
                    'priceSource': entry['source'],
                    'priceUpdatedAt': firestore.SERVER_TIMESTAMP,
                    'updatedAt': firestore.SERVER_TIMESTAMP,
                },
                merge=True,
            )
            applied += 1

    report = {
        'generatedAt': firestore.SERVER_TIMESTAMP if False else None,
        'dryRun': not APPLY,
        'headless': HEADLESS,
        'waitSeconds': WAIT_SECONDS,
        'useHttpFallback': USE_HTTP_FALLBACK,
        'includePriced': INCLUDE_PRICED,
        'totals': {
            'targeted': len(cafes),
            'found': found,
            'applied': applied,
        },
        'results': results,
    }
    report['generatedAt'] = __import__('datetime').datetime.utcnow().isoformat() + 'Z'
    REPORT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')

    print(f'[ECI-BOT] Found: {found}/{len(cafes)}')
    print(f'[ECI-BOT] Applied: {applied}')
    print(f'[ECI-BOT] Report: {REPORT_PATH}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())