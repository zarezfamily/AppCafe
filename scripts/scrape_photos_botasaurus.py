#!/usr/bin/env python3
"""
Scrape product image URLs from Cafés Guilis and 69 CrazyBeans using Botasaurus.
Outputs a JSON file with docId -> imageUrl mappings for the Node upload script.
"""
import json
import re
import time
from pathlib import Path
from botasaurus.browser import browser, Driver

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'scripts' / '_scraped_photos.json'

# Cafes we need photos for, mapped to their Firestore doc IDs
TARGETS = {
    'guilis': {
        'urls': [
            'https://cafesguilis.com/categoria-producto/cafe-grano/',
            'https://cafesguilis.com/categoria-producto/cafe-molido/',
        ],
        'products': {
            'guilis_blend_gourmet_grano_1kg': {
                'keywords': ['blend', 'gourmet'],
                'nombre': 'Cafés Guilis Blend Gourmet Grano 1kg',
            },
            'guilis_colombiano_grano_1kg': {
                'keywords': ['colombiano', 'colombia'],
                'nombre': 'Cafés Guilis Colombiano Grano 1kg',
            },
            'guilis_etiopia_grano_1kg': {
                'keywords': ['etiop', 'ethiopia'],
                'nombre': 'Cafés Guilis Etiopía Grano 1kg',
            },
        },
    },
    'crazybeans': {
        'urls': [
            'https://69specialtycoffee.com/collections/all',
            'https://69specialtycoffee.com/collections/home-principal',
        ],
        'products': {
            'crazybeans_brasil_specialty_500g': {
                'keywords': ['brasil', 'brazil'],
                'nombre': '69 CrazyBeans Brasil Specialty Grano 500g',
            },
            'crazybeans_colombia_specialty_500g': {
                'keywords': ['colombia'],
                'nombre': '69 CrazyBeans Colombia Specialty Grano 500g',
            },
        },
    },
}


@browser(headless=True)
def scrape_guilis(driver: Driver, url: str):
    """Scrape Cafés Guilis product listing page for product images."""
    print(f'\n  Loading {url}')
    driver.get(url)
    time.sleep(5)  # wait for JS render

    results = []
    # Try to find product cards
    try:
        products = driver.select_all('.product, .product-item, .woocommerce-loop-product__link, li.product, .products .product')
        print(f'  Found {len(products)} product elements')

        for p in products:
            try:
                title_el = p.select('.woocommerce-loop-product__title, .product-title, h2, h3, .title', None)
                title = title_el.text if title_el else ''

                img_el = p.select('img', None)
                img_url = ''
                if img_el:
                    img_url = img_el.get_attribute('src') or img_el.get_attribute('data-src') or img_el.get_attribute('data-lazy-src') or ''

                if title or img_url:
                    results.append({'title': title.strip(), 'img': img_url.strip()})
                    print(f'    Product: {title.strip()[:50]} -> {img_url[:80] if img_url else "NO IMG"}')
            except Exception as e:
                print(f'    Error parsing product: {e}')
    except Exception as e:
        print(f'  Error finding products: {e}')

    # Fallback: get all images on the page
    if not results:
        print('  Fallback: extracting all images from page...')
        imgs = driver.select_all('img')
        for img in imgs:
            src = img.get_attribute('src') or img.get_attribute('data-src') or ''
            alt = img.get_attribute('alt') or ''
            if src and ('product' in src.lower() or 'cafe' in alt.lower() or 'café' in alt.lower() or 'guilis' in alt.lower()):
                results.append({'title': alt.strip(), 'img': src.strip()})
                print(f'    Image: {alt[:50]} -> {src[:80]}')

    # Also try getting full page HTML and extracting with regex
    if not results:
        print('  Deep fallback: regex on page source...')
        html = driver.page_html
        # Find product images in srcset or src
        img_matches = re.findall(r'<img[^>]*src=["\']([^"\']*(?:product|cafe|guilis)[^"\']*)["\']', html, re.I)
        for m in img_matches[:20]:
            results.append({'title': '', 'img': m})
            print(f'    Regex img: {m[:80]}')

    return results


@browser(headless=True)
def scrape_crazybeans(driver: Driver, url: str):
    """Scrape 69 CrazyBeans / 69specialtycoffee.com for product images."""
    print(f'\n  Loading {url}')
    driver.get(url)
    time.sleep(5)

    results = []
    try:
        # Shopify product cards
        products = driver.select_all('.product-card, .grid__item, .collection-product-card, .card--product, [class*="product"]')
        print(f'  Found {len(products)} product elements')

        for p in products:
            try:
                title_el = p.select('.card__heading, .product-card__title, h3, h2, .title, a', None)
                title = title_el.text if title_el else ''

                img_el = p.select('img', None)
                img_url = ''
                if img_el:
                    img_url = img_el.get_attribute('src') or img_el.get_attribute('data-src') or img_el.get_attribute('srcset') or ''
                    # srcset: take the largest
                    if ',' in img_url:
                        parts = img_url.split(',')
                        img_url = parts[-1].strip().split(' ')[0]
                    # Fix protocol-relative URLs
                    if img_url.startswith('//'):
                        img_url = 'https:' + img_url

                if title or img_url:
                    results.append({'title': title.strip(), 'img': img_url.strip()})
                    print(f'    Product: {title.strip()[:50]} -> {img_url[:80] if img_url else "NO IMG"}')
            except Exception as e:
                print(f'    Error parsing: {e}')
    except Exception as e:
        print(f'  Error: {e}')

    # Fallback
    if not results:
        print('  Fallback: all images...')
        imgs = driver.select_all('img')
        for img in imgs:
            src = img.get_attribute('src') or img.get_attribute('data-src') or ''
            alt = img.get_attribute('alt') or ''
            if src and any(k in (alt + src).lower() for k in ['coffee', 'cafe', 'café', 'brasil', 'colombia', 'grano', 'bean']):
                if src.startswith('//'): src = 'https:' + src
                results.append({'title': alt.strip(), 'img': src.strip()})
                print(f'    Image: {alt[:50]} -> {src[:80]}')

    return results


def match_product(scraped_items, keywords, nombre):
    """Find the best matching product image from scraped results."""
    best = None
    best_score = 0

    for item in scraped_items:
        title = (item.get('title', '') or '').lower()
        img = item.get('img', '') or ''
        if not img or len(img) < 10:
            continue

        # Skip tiny/icon images
        if any(skip in img.lower() for skip in ['icon', 'logo', 'badge', 'svg', '1x1', 'placeholder', 'blank']):
            continue

        score = sum(1 for kw in keywords if kw in title)
        # Also check in URL
        score += sum(0.5 for kw in keywords if kw in img.lower())

        if score > best_score:
            best_score = score
            best = img

    return best


def main():
    all_results = {}

    # --- Scrape Guilis ---
    print('=== Scraping Cafés Guilis ===')
    guilis_items = []
    for url in TARGETS['guilis']['urls']:
        try:
            items = scrape_guilis(url)
            guilis_items.extend(items)
        except Exception as e:
            print(f'  Error scraping {url}: {e}')

    print(f'\n  Total Guilis items scraped: {len(guilis_items)}')

    for doc_id, info in TARGETS['guilis']['products'].items():
        img = match_product(guilis_items, info['keywords'], info['nombre'])
        if img:
            all_results[doc_id] = img
            print(f'  MATCH {info["nombre"]}: {img[:80]}')
        else:
            print(f'  NO MATCH for {info["nombre"]}')

    # --- Scrape CrazyBeans ---
    print('\n=== Scraping 69 CrazyBeans ===')
    crazy_items = []
    for url in TARGETS['crazybeans']['urls']:
        try:
            items = scrape_crazybeans(url)
            crazy_items.extend(items)
        except Exception as e:
            print(f'  Error scraping {url}: {e}')

    print(f'\n  Total CrazyBeans items scraped: {len(crazy_items)}')

    for doc_id, info in TARGETS['crazybeans']['products'].items():
        img = match_product(crazy_items, info['keywords'], info['nombre'])
        if img:
            all_results[doc_id] = img
            print(f'  MATCH {info["nombre"]}: {img[:80]}')
        else:
            print(f'  NO MATCH for {info["nombre"]}')

    # --- Save results ---
    print(f'\n=== Results: {len(all_results)} matches ===')
    for doc_id, url in all_results.items():
        print(f'  {doc_id}: {url[:100]}')

    OUTPUT.write_text(json.dumps(all_results, indent=2, ensure_ascii=False))
    print(f'\nSaved to {OUTPUT}')


if __name__ == '__main__':
    main()
