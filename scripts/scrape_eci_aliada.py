"""
Scrape official Aliada coffee products from El Corte Inglés.
Navigate the search results and extract product names + images.
"""
from botasaurus.browser import browser, Driver
from botasaurus.soupify import soupify
import json, os, time, re

SEARCH_URL = "https://www.elcorteingles.es/supermercado/brand%3A%3AEL%20CORTE%20INGLES%2C%2CEL%20CORTE%20INGLES%20SELECTION/buscar/?question=cafe%20aliada&catalog=supermercado&stype=text_box"

@browser(headless=False, block_images=False, reuse_driver=True)
def scrape_eci_aliada(driver: Driver, data):
    """Scrape Aliada coffee products from El Corte Inglés."""
    products = []
    
    print("  Navigating to ECI search page...")
    driver.get(SEARCH_URL)
    time.sleep(5)
    
    # Accept cookies if needed
    try:
        btns = driver.select_all('button')
        for btn in btns:
            txt = (btn.text or '').lower()
            if 'aceptar' in txt or 'accept' in txt or 'todo' in txt:
                btn.click()
                time.sleep(2)
                break
    except:
        pass
    
    time.sleep(3)
    
    # Scroll to load all products
    for i in range(5):
        driver.run_js("window.scrollBy(0, 800)")
        time.sleep(1)
    
    soup = soupify(driver)
    
    # Find product tiles
    # ECI uses various selectors for product cards
    tiles = soup.select('.product_tile, .product-preview, [data-product-id], .plp-item, .grid-item, .product-card, .product_list--item, li[data-json]')
    
    print(f"  Found {len(tiles)} product tiles")
    
    if not tiles:
        # Try broader selectors
        # Look for product links with images
        all_links = soup.select('a[href*="/supermercado/"]')
        print(f"  Found {len(all_links)} supermercado links")
        
        # Look for images that seem like products
        all_imgs = soup.select('img[src*="sgfm.elcorteingles"], img[data-src*="sgfm.elcorteingles"], img[src*="cloud.elcorteingles"]')
        print(f"  Found {len(all_imgs)} ECI product images")
        
        # Try to find product containers by looking at the page structure
        # Often it's divs with specific data attributes
        containers = soup.select('[data-name], [data-product-name]')
        print(f"  Found {len(containers)} data-name containers")
        
        # Debug: print page title and key elements
        title = soup.select_one('title')
        print(f"  Page title: {title.text if title else 'N/A'}")
        
        # Check if there's a "no results" message
        no_results = soup.select('.no-results, .empty-search, .search-empty')
        if no_results:
            print("  NO RESULTS FOUND on page")
        
        # Try to get product info from script/JSON data embedded in page
        for script in soup.select('script[type="application/json"], script[type="application/ld+json"]'):
            txt = script.string or ''
            if 'aliada' in txt.lower() or 'cafe' in txt.lower():
                print(f"  Found JSON with cafe/aliada ({len(txt)} chars)")
                try:
                    data = json.loads(txt)
                    print(f"  JSON keys: {list(data.keys()) if isinstance(data, dict) else type(data)}")
                except:
                    pass
    
    # Method 2: Extract from page HTML directly
    # Look for product links and images
    product_links = []
    for a in soup.select('a[href]'):
        href = a.get('href', '')
        if '/supermercado/' in href and ('aliada' in href.lower() or 'cafe' in a.get_text('', strip=True).lower()):
            img = a.select_one('img')
            img_src = None
            if img:
                img_src = img.get('src') or img.get('data-src') or img.get('data-lazy')
            text = a.get_text(' ', strip=True)
            if text and len(text) > 5 and 'aliada' in text.lower():
                product_links.append({
                    'name': text[:100],
                    'url': href if href.startswith('http') else 'https://www.elcorteingles.es' + href,
                    'image': img_src,
                })
    
    print(f"\n  Product links found: {len(product_links)}")
    for p in product_links:
        print(f"    {p['name'][:60]}")
        if p['image']:
            print(f"      IMG: {p['image'][:80]}")
    
    # Deduplicate by URL
    seen_urls = set()
    unique_products = []
    for p in product_links:
        if p['url'] not in seen_urls:
            seen_urls.add(p['url'])
            unique_products.append(p)
    
    print(f"\n  Unique products: {len(unique_products)}")
    
    # Now visit each product page to get the high-res image
    for i, prod in enumerate(unique_products):
        print(f"\n  [{i+1}/{len(unique_products)}] {prod['name'][:60]}")
        print(f"    URL: {prod['url']}")
        
        driver.get(prod['url'])
        time.sleep(4)
        
        soup2 = soupify(driver)
        
        # Get the main product image (high-res)
        img_url = None
        
        # Try og:image
        og = soup2.select_one('meta[property="og:image"]')
        if og:
            img_url = og.get('content')
        
        # Try product image containers
        if not img_url:
            for selector in ['#js_pdp_image img', '.pdp-image img', '.product-image img', 
                           'img.product_image', '.media-viewer img', '.image-zoom img',
                           '.product-detail__image img', 'picture source', 'img[data-zoom]']:
                imgs = soup2.select(selector)
                for img in imgs:
                    src = img.get('src') or img.get('data-src') or img.get('data-zoom-image') or ''
                    if src and ('sgfm' in src or 'cloud.elcorteingles' in src) and len(src) > 30:
                        img_url = src
                        break
                if img_url:
                    break
        
        # Try any large ECI image
        if not img_url:
            for img in soup2.select('img'):
                src = img.get('src', '')
                if ('sgfm.elcorteingles' in src or 'cloud.elcorteingles' in src) and len(src) > 50:
                    img_url = src
                    break
        
        if img_url:
            # Try to get highest resolution
            if 'sgfm.elcorteingles' in img_url:
                # ECI image URLs often have size parameters - try to get large
                img_url = re.sub(r'/\d+x\d+/', '/1200x1200/', img_url)
            prod['highres_image'] = img_url
            print(f"    IMAGE: {img_url[:100]}...")
        else:
            print(f"    NO HIGH-RES IMAGE")
        
        products.append(prod)
        time.sleep(2)
    
    return products


if __name__ == "__main__":
    print("=== Scraping Aliada coffees from El Corte Inglés ===\n")
    results = scrape_eci_aliada() or []
    
    outpath = os.path.join("scripts", "aliada_eci_official.json")
    with open(outpath, "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\n=== Saved {len(results)} products to {outpath} ===")
    
    for p in results:
        print(f"  {p['name'][:60]}")
        print(f"    {p.get('highres_image', p.get('image', 'NO IMAGE'))[:80]}")
