"""
Scrape product images for coffees missing photos from:
- Ahorramas (Alipende)
- El Corte Inglés (Aliada)
- Alcampo/Auchan
- BM Supermercados

Uses Botasaurus to handle JS-rendered pages.
"""
from botasaurus.browser import browser, Driver
from botasaurus.soupify import soupify
import json, os, time, re

OUTPUT_FILE = "scripts/scraped_photos.json"

# --- Search configurations per brand ---
SEARCHES = [
    # Ahorramas / Alipende
    {"brand": "Alipende", "url": "https://www.ahorramas.com/buscador?q=cafe+alipende", "site": "ahorramas"},
    # El Corte Inglés / Aliada  
    {"brand": "Aliada", "url": "https://www.elcorteingles.es/supermercado/buscar/cafe+aliada/", "site": "eci"},
    # Alcampo / Auchan
    {"brand": "AUCHAN", "url": "https://www.compraonline.alcampo.es/search?q=cafe+auchan", "site": "alcampo"},
    # BM Supermercados
    {"brand": "BM", "url": "https://tienda.bmsupermercados.es/search?query=cafe+bm", "site": "bm"},
]

# Also try direct Google Images searches as backup
GOOGLE_SEARCHES = [
    {"brand": "Alipende", "queries": [
        "alipende cafe molido natural 250g producto",
        "alipende cafe grano 500g producto",
        "alipende cafe capsulas nespresso producto",
        "alipende cafe soluble producto",
    ]},
    {"brand": "Aliada", "queries": [
        "aliada cafe molido natural el corte ingles producto",
        "aliada cafe grano el corte ingles producto",
        "aliada cafe capsulas nespresso el corte ingles producto",
        "aliada cafe soluble el corte ingles producto",
    ]},
    {"brand": "AUCHAN", "queries": [
        "auchan cafe molido gourmet alcampo producto",
        "auchan cafe grano alcampo producto",
        "auchan cafe capsulas nespresso alcampo producto",
        "auchan cafe soluble alcampo producto",
        "auchan bio cafe alcampo producto",
    ]},
    {"brand": "BM", "queries": [
        "bm supermercados cafe molido producto",
        "bm supermercados cafe grano producto",
        "bm supermercados cafe capsulas producto",
    ]},
]

all_results = []

@browser(
    headless=False,
    block_images=False,
    reuse_driver=True,
)
def scrape_store_pages(driver: Driver, data):
    """Scrape product pages from store sites."""
    results = []
    
    for search in SEARCHES:
        brand = search["brand"]
        url = search["url"]
        site = search["site"]
        print(f"\n>>> Scraping {brand} from {site}: {url}")
        
        try:
            driver.get(url)
            time.sleep(4)  # Wait for JS rendering
            
            # Accept cookies if present
            try:
                cookie_btns = driver.select_all('[class*="cookie"] button, [class*="Cookie"] button, [id*="cookie"] button, .accept-cookies, #onetrust-accept-btn-handler, button[data-testid*="accept"]')
                for btn in cookie_btns:
                    try:
                        btn.click()
                        time.sleep(1)
                        break
                    except:
                        pass
            except:
                pass
            
            time.sleep(2)
            
            # Scroll down to load more products
            for _ in range(3):
                driver.run_js("window.scrollBy(0, 1000)")
                time.sleep(1)
            
            soup = soupify(driver)
            
            # Find product images - try various selectors
            images = []
            selectors = [
                'img[src*="cafe"]', 'img[src*="coffee"]',
                'img[alt*="café"]', 'img[alt*="cafe"]', 'img[alt*="Café"]',
                '.product img', '.product-card img', '.product-image img',
                '[class*="product"] img', '[class*="Product"] img',
                'article img', '.card img', '.item img',
                'img[data-src*="cafe"]', 'img[data-src*="coffee"]',
                'img[loading="lazy"]',
            ]
            
            for sel in selectors:
                found = soup.select(sel)
                images.extend(found)
            
            # Dedupe by src
            seen = set()
            for img in images:
                src = img.get('src') or img.get('data-src') or img.get('data-original') or ''
                alt = (img.get('alt') or '').lower()
                
                if not src or src in seen:
                    continue
                # Skip tiny icons, logos etc
                if any(x in src.lower() for x in ['logo', 'icon', 'banner', 'sprite', 'pixel', 'svg', 'base64']):
                    continue
                    
                seen.add(src)
                results.append({
                    "brand": brand,
                    "site": site,
                    "img_url": src,
                    "alt": alt,
                    "page_url": url,
                })
                
            print(f"  Found {len(seen)} unique images for {brand}")
            
        except Exception as e:
            print(f"  ERROR scraping {site}: {e}")
    
    return results


@browser(
    headless=False,
    block_images=False,
    reuse_driver=True,
)
def scrape_google_images(driver: Driver, data):
    """Search Google Images as fallback for product photos."""
    results = []
    
    for brand_config in GOOGLE_SEARCHES:
        brand = brand_config["brand"]
        
        for query in brand_config["queries"]:
            print(f"\n>>> Google Images: '{query}'")
            
            try:
                search_url = f"https://www.google.com/search?q={query.replace(' ', '+')}&tbm=isch"
                driver.get(search_url)
                time.sleep(3)
                
                # Accept Google cookies if needed
                try:
                    btns = driver.select_all('button')
                    for btn in btns:
                        if 'Aceptar' in (btn.text or '') or 'Accept' in (btn.text or ''):
                            btn.click()
                            time.sleep(1)
                            break
                except:
                    pass
                
                time.sleep(2)
                soup = soupify(driver)
                
                # Get image thumbnails from Google Images
                imgs = soup.select('img[src^="http"]')
                count = 0
                seen = set()
                
                for img in imgs[:20]:  # Top 20 results
                    src = img.get('src', '')
                    alt = (img.get('alt') or '').lower()
                    
                    if not src or src in seen:
                        continue
                    if any(x in src.lower() for x in ['google', 'gstatic', 'logo', 'icon', 'base64']):
                        continue
                    if len(src) < 30:
                        continue
                        
                    seen.add(src)
                    results.append({
                        "brand": brand,
                        "site": "google",
                        "query": query,
                        "img_url": src,
                        "alt": alt,
                    })
                    count += 1
                
                print(f"  Found {count} images")
                time.sleep(2)  # Be polite
                
            except Exception as e:
                print(f"  ERROR: {e}")
    
    return results


if __name__ == "__main__":
    print("=== Phase 1: Scraping store pages ===")
    store_results = scrape_store_pages()
    
    print(f"\n=== Phase 2: Google Images fallback ===")
    google_results = scrape_google_images()
    
    all_results = (store_results or []) + (google_results or [])
    
    # Save results
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)
    
    print(f"\n=== TOTAL: {len(all_results)} images found ===")
    for brand in ["Alipende", "Aliada", "AUCHAN", "BM"]:
        count = len([r for r in all_results if r["brand"] == brand])
        print(f"  {brand}: {count}")
    print(f"Saved to {OUTPUT_FILE}")
