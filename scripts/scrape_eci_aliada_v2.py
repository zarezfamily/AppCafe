"""
Scrape official Aliada coffee products from El Corte Inglés.
Uses slow navigation with human-like behavior to avoid bot detection.
"""
from botasaurus.browser import browser, Driver
from botasaurus.soupify import soupify
import json, os, time, re

SEARCH_URL = "https://www.elcorteingles.es/supermercado/buscar/?question=cafe+aliada&catalog=supermercado&stype=text_box"

@browser(headless=False, block_images=False, reuse_driver=True, 
         user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
def scrape_eci(driver: Driver, data):
    """Navigate ECI with human-like behavior."""
    products = []
    
    # First visit the homepage to get cookies
    print("  Step 1: Visit ECI homepage...")
    driver.get("https://www.elcorteingles.es/supermercado/")
    time.sleep(6)
    
    # Accept cookies
    try:
        for btn in driver.select_all('button, [id*="cookie"], [class*="cookie"]'):
            txt = (btn.text or '').lower()
            if any(w in txt for w in ['aceptar', 'accept', 'todas', 'todo']):
                btn.click()
                print("  Accepted cookies")
                time.sleep(2)
                break
    except:
        pass
    
    # Now search for Aliada cafe
    print("  Step 2: Searching for 'cafe aliada'...")
    driver.get(SEARCH_URL)
    time.sleep(8)
    
    # Scroll slowly like a human
    for i in range(8):
        driver.run_js(f"window.scrollBy(0, {300 + i*50})")
        time.sleep(0.8)
    
    time.sleep(3)
    
    soup = soupify(driver)
    page_text = soup.get_text(' ', strip=True)[:500]
    print(f"  Page text preview: {page_text[:200]}...")
    
    # Try multiple selectors for product tiles
    selectors = [
        '.product_tile',
        '.product-preview', 
        '[data-product-id]',
        '.plp-item',
        '.grid-item',
        '.product-card',
        '.product_list--item',
        'li[data-json]',
        'article',
        '.js-product',
        'div[data-productid]',
    ]
    
    tiles = []
    for sel in selectors:
        found = soup.select(sel)
        if found:
            print(f"  Selector '{sel}': {len(found)} matches")
            tiles.extend(found)
    
    # Method: Find all links with product images
    product_data = {}
    
    for a in soup.select('a[href]'):
        href = a.get('href', '')
        text = a.get_text(' ', strip=True)
        
        # Look for ECI product links
        if '/supermercado/' in href and href.endswith('.html'):
            img = a.select_one('img')
            img_src = None
            if img:
                img_src = img.get('src') or img.get('data-src') or img.get('data-lazy') or img.get('data-original')
            
            if not href.startswith('http'):
                href = 'https://www.elcorteingles.es' + href
            
            if href not in product_data and (text or img_src):
                product_data[href] = {
                    'name': text[:120] if text else '',
                    'url': href,
                    'image': img_src,
                }
    
    # Also try to get images that are loaded via JavaScript
    all_imgs = soup.select('img')
    eci_imgs = []
    for img in all_imgs:
        src = img.get('src') or img.get('data-src') or ''
        alt = img.get('alt', '')
        if ('sgfm' in src or 'cloud.elcorteingles' in src) and len(src) > 30:
            eci_imgs.append({'src': src, 'alt': alt})
    
    print(f"\n  Total product links: {len(product_data)}")
    print(f"  ECI images: {len(eci_imgs)}")
    
    # Filter for Aliada products
    aliada_products = {}
    for url, info in product_data.items():
        if 'aliada' in (info['name'] + url).lower() and 'caf' in (info['name'] + url).lower():
            aliada_products[url] = info
            print(f"    ALIADA: {info['name'][:60]}")
            if info['image']:
                print(f"      IMG: {info['image'][:80]}")
    
    print(f"\n  Aliada coffee products: {len(aliada_products)}")
    
    # Visit each product page for high-res images
    for url, info in aliada_products.items():
        print(f"\n  Visiting: {info['name'][:60]}")
        driver.get(url)
        time.sleep(4)
        
        soup2 = soupify(driver)
        
        # Get high-res image
        img_url = None
        
        # og:image
        og = soup2.select_one('meta[property="og:image"]')
        if og and og.get('content'):
            img_url = og['content']
        
        # Product detail images
        if not img_url:
            for img in soup2.select('img'):
                src = img.get('src') or img.get('data-src') or ''
                if ('sgfm' in src or 'cloud.elcorteingles' in src) and len(src) > 50:
                    # Skip tiny thumbnails
                    if '/s/' not in src or '/xxl/' in src or '/xl/' in src or '/l/' in src:
                        img_url = src
                        break
        
        if img_url:
            # Upgrade to largest size
            img_url = re.sub(r'/(s|m|l|xl)/', '/xxl/', img_url)
            info['highres_image'] = img_url
            print(f"    HIGH-RES: {img_url[:100]}...")
        
        products.append(info)
        time.sleep(2)
    
    # If no Aliada products found through links, dump some debug info
    if not aliada_products:
        print("\n  === DEBUG: No Aliada products found ===")
        print(f"  All product links ({len(product_data)}):")
        for url, info in list(product_data.items())[:20]:
            print(f"    {info['name'][:50]} -> {url[:80]}")
        
        print(f"\n  ECI images ({len(eci_imgs)}):")
        for img in eci_imgs[:20]:
            print(f"    alt='{img['alt'][:40]}' src={img['src'][:80]}")
        
        # Save full page source for debugging
        with open("scripts/eci_debug_page.html", "w") as f:
            f.write(str(soup))
        print("  Saved page HTML to scripts/eci_debug_page.html")
    
    return products


if __name__ == "__main__":
    print("=== Scraping Aliada coffees from El Corte Inglés ===\n")
    results = scrape_eci() or []
    
    outpath = os.path.join("scripts", "aliada_eci_official.json")
    with open(outpath, "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\n=== Saved {len(results)} products to {outpath} ===")
