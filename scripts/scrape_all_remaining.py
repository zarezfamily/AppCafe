#!/usr/bin/env python3
"""
Scrape ALL remaining 37 cafes product images using Botasaurus.
Downloads images and saves them to tmp_photos/ for the Node upload script.
"""
import base64
import json
import os
import time
from pathlib import Path
from urllib.request import urlopen, Request

from botasaurus.browser import browser, Driver

ROOT = Path(__file__).resolve().parents[1]
TMP_DIR = ROOT / 'tmp_photos'
TMP_DIR.mkdir(exist_ok=True)

# ── Sites that need Botasaurus (Cloudflare/JS-rendered) ──
BOTASAURUS_TARGETS = [
    # Barco
    {'name': 'barco_natural_grano_500g', 'url': 'https://barcocafes.com/productos/', 'keywords': ['natural', 'grano']},
    {'name': 'barco_torrefacto_grano_500g', 'url': 'https://barcocafes.com/productos/', 'keywords': ['torrefacto', 'grano']},
    # Delta (all share same products page)
    {'name': 'delta_lote_superior_grano_1kg', 'url': 'https://deltacafes.com/es/productos/#grao', 'keywords': ['superior', 'lote']},
    {'name': 'delta_lote_chavena_grano_1kg', 'url': 'https://deltacafes.com/es/productos/#grao', 'keywords': ['chávena', 'chavena']},
    {'name': 'delta_platinum_grano_1kg', 'url': 'https://deltacafes.com/es/productos/#grao', 'keywords': ['platinum']},
    {'name': 'delta_expresso_bar_grano_1kg', 'url': 'https://deltacafes.com/es/productos/#grao', 'keywords': ['expresso', 'bar']},
    {'name': 'delta_colombia_origen_grano_500g', 'url': 'https://deltacafes.com/es/productos/#grao', 'keywords': ['colombia', 'origen']},
    # Toscaf
    {'name': 'toscaf_natural_grano_1kg', 'url': 'https://cafestoscaf.es/web/tienda/', 'keywords': ['natural', 'grano']},
    {'name': 'toscaf_mezcla_grano_1kg', 'url': 'https://cafestoscaf.es/web/tienda/', 'keywords': ['mezcla', 'grano']},
    {'name': 'toscaf_descafeinado_grano_500g', 'url': 'https://cafestoscaf.es/web/tienda/', 'keywords': ['descafeinado', 'grano']},
    # El Criollo
    {'name': 'el_criollo_blend_especial_grano_250g', 'url': 'https://cafeselcriollo.com/particulares/cafes/', 'keywords': ['blend', 'especial']},
    {'name': 'el_criollo_colombia_specialty_250g', 'url': 'https://cafeselcriollo.com/particulares/cafes/', 'keywords': ['colombia']},
    {'name': 'el_criollo_etiopia_specialty_250g', 'url': 'https://cafeselcriollo.com/particulares/cafes/', 'keywords': ['etiop']},
    # La Brasileña
    {'name': 'la_brasilena_mezcla_grano_250g', 'url': 'https://www.cafeslabrasilena.es/tienda/cafe/', 'keywords': ['mezcla', 'grano']},
    {'name': 'la_brasilena_natural_grano_250g', 'url': 'https://www.cafeslabrasilena.es/tienda/cafe/', 'keywords': ['natural', 'grano']},
    # Montecelio
    {'name': 'montecelio_brazil_grano_1kg', 'url': 'https://montecelio.es/productos/earth/', 'keywords': ['brasil', 'brazil']},
    {'name': 'montecelio_colombia_grano_1kg', 'url': 'https://montecelio.es/productos/earth/', 'keywords': ['colombia']},
    {'name': 'montecelio_etiopia_grano_1kg', 'url': 'https://montecelio.es/productos/earth/', 'keywords': ['etiop']},
    # Jurado
    {'name': 'jurado_natural_molido_250g', 'url': 'https://cafejurado.com/10-cafe', 'keywords': ['natural', 'molido']},
    {'name': 'jurado_descafeinado_molido_250g', 'url': 'https://cafejurado.com/10-cafe', 'keywords': ['descafeinado', 'molido']},
    {'name': 'jurado_ecologico_molido_250g', 'url': 'https://cafejurado.com/10-cafe', 'keywords': ['ecológico', 'ecologico', 'bio']},
]

# ── Direct download URLs (no Cloudflare) ──
DIRECT_URLS = {
    # Cafès Pont (WooCommerce, direct image URLs found)
    'pont_arabica_premium_grano_250g': 'https://cafespont.com/wp-content/uploads/2019/10/CAFE-EN-GRANO-NATURAL-ALIMENTACION-250G.jpg',
    'pont_descafeinado_grano_250g': 'https://cafespont.com/wp-content/uploads/2019/10/CAFE-EN-GRANO-DESCAFEINADO-ALIMENTACION-250G.jpg',
    # Caffè Corsini (Shopify CDN)
    'caffè_corsini_arabica_grano_1kg': 'https://cdn.shopify.com/s/files/1/0793/4971/1136/files/DAR024_chicchi.jpg?v=1718707040',
    # Caffè Mauro (Shopify CDN)
    'caffe_mauro_100_arabica_grano_1kg': 'https://cdn.shopify.com/s/files/1/0603/0255/7366/files/grani-caffe-mauro-arabica.jpg?v=1717513472',
}

# ── Amazon products (need botasaurus) ──
AMAZON_TARGETS = [
    # by Amazon
    {'name': 'amazon_classico_grano_1kg', 'url': 'https://www.amazon.es/dp/B09S1SXTQZ', 'search': 'by Amazon Café Grano Classico 1kg'},
    {'name': 'amazon_colombiano_grano_1kg', 'url': 'https://www.amazon.es/dp/B0D1BXQVJH', 'search': 'by Amazon Colombiano Grano 1kg'},
    {'name': 'amazon_espresso_crema_grano_1kg', 'url': 'https://www.amazon.es/dp/B09S1RBHXF', 'search': 'by Amazon Espresso Crema Grano 1kg'},
    {'name': 'amazon_fuerte_grano_1kg', 'url': 'https://www.amazon.es/dp/B09S1KP3WK', 'search': 'by Amazon Café Grano Fuerte 1kg'},
    {'name': 'amazon_intenso_grano_1kg', 'url': 'https://www.amazon.es/dp/B09S1LJCR6', 'search': 'by Amazon Intenso Tostado Ligero 1kg'},
    # Der-Franz
    {'name': 'der_franz_colombia_grano_1kg', 'url': 'https://www.amazon.es/dp/B08NCJVLQB', 'search': 'Der-Franz Colombia Single Origin Grano 1kg'},
    {'name': 'der_franz_espresso_grano_1kg', 'url': 'https://www.amazon.es/dp/B07X3F15TM', 'search': 'Der-Franz Espresso Grano 1kg'},
    # Black Donkey
    {'name': 'black_donkey_colombia_grano_250g', 'url': 'https://www.amazon.es/s?k=black+donkey+coffee+colombia', 'search': 'Black Donkey Colombia'},
    {'name': 'black_donkey_world_coffees_6x100g', 'url': 'https://www.amazon.es/s?k=black+donkey+world+coffees', 'search': 'Black Donkey World Coffees'},
    # Note d'Espresso
    {'name': 'note_espresso_clasico_grano_1kg', 'url': 'https://www.amazon.es/s?k=note+d+espresso+clasico+grano', 'search': 'Note d Espresso Clasico'},
    # Daddy Long Legs
    {'name': 'daddy_long_legs_house_blend_250g', 'url': 'https://www.amazon.es/s?k=daddy+long+legs+coffee', 'search': 'Daddy Long Legs House Blend'},
    {'name': 'daddy_long_legs_kenya_250g', 'url': 'https://www.amazon.es/s?k=daddy+long+legs+coffee+kenya', 'search': 'Daddy Long Legs Kenya'},
]


def download_direct(url):
    """Download via urllib (no browser needed)."""
    req = Request(url, headers={'User-Agent': 'EtioveApp/1.0'})
    try:
        with urlopen(req, timeout=15) as resp:
            if resp.status == 200:
                return resp.read()
    except Exception:
        pass
    return None


@browser(headless=True, max_retry=1)
def scrape_brand_site(driver: Driver, data: dict):
    """Scrape a brand website for product images. Processes all targets for the same URL."""
    url = data['url']
    targets = data['targets']

    print(f'\n  Loading {url}')
    driver.get(url)
    time.sleep(5)

    # Extract all images with their context
    images = []
    try:
        all_imgs = driver.select_all('img')
        for img in all_imgs:
            src = img.get_attribute('src') or img.get_attribute('data-src') or img.get_attribute('data-lazy-src') or ''
            alt = img.get_attribute('alt') or ''
            title_attr = img.get_attribute('title') or ''

            # Get parent text for context
            parent_text = ''
            try:
                parent = img.select_all('xpath:./ancestor::*[position()<=3]')
                for p in parent:
                    parent_text += ' ' + (p.text or '')
            except Exception:
                pass

            if src and len(src) > 10:
                if src.startswith('//'): src = 'https:' + src
                if src.startswith('/'): 
                    from urllib.parse import urlparse
                    parsed = urlparse(url)
                    src = f'{parsed.scheme}://{parsed.netloc}{src}'
                images.append({
                    'src': src,
                    'alt': alt.lower(),
                    'title': title_attr.lower(),
                    'parent': parent_text.lower()[:200],
                    'context': f'{alt} {title_attr} {parent_text}'.lower()
                })
    except Exception as e:
        print(f'  Error extracting images: {e}')

    print(f'  Found {len(images)} images on page')

    # Match each target
    results = []
    for t in targets:
        best_src = None
        best_score = 0
        for img in images:
            # Skip tiny/icon images
            if any(x in img['src'].lower() for x in ['icon', 'logo', 'badge', 'svg', '1x1', 'placeholder', 'blank', 'pixel', 'spinner', 'loading']):
                continue
            # Skip external CDN/tracking
            if any(x in img['src'].lower() for x in ['google', 'facebook', 'analytics', 'tracker']):
                continue

            score = 0
            for kw in t['keywords']:
                kw_lower = kw.lower()
                if kw_lower in img['alt']: score += 3
                if kw_lower in img['title']: score += 2
                if kw_lower in img['src'].lower(): score += 2
                if kw_lower in img['parent']: score += 1

            if score > best_score:
                best_score = score
                best_src = img['src']

        if best_src:
            print(f'  MATCH [{t["name"]}] score={best_score}: {best_src[:80]}')
            results.append({'name': t['name'], 'src': best_src, 'score': best_score})
        else:
            # Fallback: take first large product-looking image
            for img in images:
                src = img['src']
                if any(x in src.lower() for x in ['product', 'uploads', 'wp-content', 'media', 'imagen']):
                    if not any(x in src.lower() for x in ['icon', 'logo', 'badge', 'svg']):
                        print(f'  FALLBACK [{t["name"]}]: {src[:80]}')
                        results.append({'name': t['name'], 'src': src, 'score': 0})
                        break
            else:
                print(f'  NO MATCH [{t["name"]}]')

    return results


@browser(headless=True, max_retry=1)
def scrape_amazon(driver: Driver, data: dict):
    """Scrape Amazon product page for main product image."""
    name = data['name']
    url = data['url']

    print(f'\n  Loading Amazon: {name}')
    print(f'    URL: {url}')
    driver.get(url)
    time.sleep(4)

    # Try to find main product image
    selectors = [
        '#landingImage', '#imgBlkFront', '#main-image',
        '.s-image', '#productImage img', '.a-dynamic-image',
        'img[data-a-dynamic-image]'
    ]

    for sel in selectors:
        try:
            img = driver.select(sel, None)
            if img:
                src = img.get_attribute('src') or ''
                if src and 'images-amazon' in src.lower() and len(src) > 20:
                    # Get high-res version
                    src = src.split('._')[0] + '._SL1500_.jpg'
                    print(f'    Found: {src[:80]}')
                    return {'name': name, 'src': src}
        except Exception:
            pass

    # Fallback: find any Amazon product image
    try:
        imgs = driver.select_all('img')
        for img in imgs:
            src = img.get_attribute('src') or ''
            if 'images-amazon' in src and 'SL' in src and len(src) > 30:
                if not any(x in src.lower() for x in ['icon', 'logo', 'badge', 'sprite', 'transparent']):
                    src_hires = src.split('._')[0] + '._SL1500_.jpg'
                    print(f'    Fallback img: {src_hires[:80]}')
                    return {'name': name, 'src': src_hires}
    except Exception:
        pass

    print(f'    No product image found')
    return {'name': name, 'src': None}


def download_with_botasaurus(driver, url):
    """Download image bytes using the browser."""
    try:
        js = """
        const resp = await fetch(arguments[0]);
        const blob = await resp.blob();
        const reader = new FileReader();
        return new Promise(r => { reader.onloadend = () => r(reader.result); reader.readAsDataURL(blob); });
        """
        data_url = driver.run_js(f'return fetch("{url}").then(r=>r.blob()).then(b=>new Promise(r=>{{const reader=new FileReader();reader.onloadend=()=>r(reader.result);reader.readAsDataURL(b);}}))')
        if data_url and ',' in data_url:
            return base64.b64decode(data_url.split(',', 1)[1])
    except Exception:
        pass
    return None


def save_image(name, img_bytes):
    """Save image to tmp_photos/."""
    if img_bytes and len(img_bytes) > 1000:
        out = TMP_DIR / f'{name}.jpg'
        out.write_bytes(img_bytes)
        print(f'    Saved: {out.name} ({len(img_bytes)//1024} KB)')
        return True
    return False


def main():
    print('=== Mega Scrape: All 37 Remaining Cafes ===\n')

    found = {}

    # ── 1. Direct downloads (no browser needed) ──
    print('\n--- Direct Downloads ---')
    for doc_id, url in DIRECT_URLS.items():
        print(f'  {doc_id}: {url[:70]}...')
        data = download_direct(url)
        if data and len(data) > 1000:
            save_image(doc_id, data)
            found[doc_id] = url
        else:
            print(f'    FAILED')

    # ── 2. Brand websites via Botasaurus ──
    print('\n--- Brand Websites (Botasaurus) ---')
    # Group targets by URL to avoid loading same page multiple times
    url_groups = {}
    for t in BOTASAURUS_TARGETS:
        url = t['url']
        if url not in url_groups:
            url_groups[url] = []
        url_groups[url].append(t)

    tasks = [{'url': url, 'targets': targets} for url, targets in url_groups.items()]

    for task in tasks:
        try:
            results = scrape_brand_site(task)
            if isinstance(results, list):
                for r in results:
                    if isinstance(r, dict) and r.get('src'):
                        found[r['name']] = r['src']
            elif isinstance(results, dict) and results.get('src'):
                found[results['name']] = results['src']
        except Exception as e:
            print(f'  Error: {e}')

    # ── 3. Amazon products ──
    print('\n--- Amazon Products (Botasaurus) ---')
    for target in AMAZON_TARGETS:
        try:
            result = scrape_amazon(target)
            if isinstance(result, list):
                for r in result:
                    if r and r.get('src'):
                        found[r['name']] = r['src']
            elif result and result.get('src'):
                found[result['name']] = result['src']
        except Exception as e:
            print(f'  Error: {e}')

    # ── 4. Download all found images ──
    print(f'\n--- Downloading {len(found)} images ---')
    downloaded = 0
    for doc_id, url in found.items():
        out = TMP_DIR / f'{doc_id}.jpg'
        if out.exists() and out.stat().st_size > 1000:
            print(f'  SKIP {doc_id} (already downloaded)')
            downloaded += 1
            continue
        print(f'  Downloading {doc_id}: {url[:70]}...')
        data = download_direct(url)
        if data and save_image(doc_id, data):
            downloaded += 1
        else:
            print(f'    Direct failed, will need botasaurus download')

    # ── Summary ──
    print(f'\n=== Summary ===')
    print(f'  Found URLs: {len(found)}')
    print(f'  Downloaded: {downloaded}')
    
    # Save results
    out_path = ROOT / 'scripts' / '_scraped_all_photos.json'
    out_path.write_text(json.dumps(found, indent=2, ensure_ascii=False))
    print(f'  Saved to: {out_path}')


if __name__ == '__main__':
    main()
