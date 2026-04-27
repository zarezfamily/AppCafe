"""
Scrape FULL-RESOLUTION images for the 10 Alipende products that only got tiny thumbnails.
Strategy: Click on each Google Images result to open the preview panel and extract the full-res URL.
"""
from botasaurus.browser import browser, Driver
from botasaurus.soupify import soupify
import json, os, time, re

# Only the 10 that got 46x46 thumbnails
PRODUCTS = [
    ("ahorramas_alipende_molido_natural_250", "alipende cafe molido natural 250g"),
    ("ahorramas_alipende_molido_descaf_250", "alipende cafe molido descafeinado 250g"),
    ("ahorramas_alipende_molido_colombia_250", "alipende cafe molido colombia 250g"),
    ("ahorramas_alipende_molido_natural_500", "alipende cafe molido natural 500g"),
    ("ahorramas_alipende_grano_natural_500", "alipende cafe grano natural 500g"),
    ("ahorramas_alipende_grano_descaf_500", "alipende cafe grano descafeinado 500g"),
    ("ahorramas_alipende_soluble_natural_200", "alipende cafe soluble natural 200g"),
    ("ahorramas_alipende_capsulas_descaf_nesp_10", "alipende capsulas cafe descafeinado nespresso 10"),
    ("ahorramas_alipende_capsulas_intenso_nesp_10", "alipende capsulas cafe intenso nespresso 10"),
    ("ahorramas_alipende_capsulas_intenso_dg_16", "alipende capsulas cafe intenso dolce gusto 16"),
]

@browser(headless=False, block_images=False, reuse_driver=True)
def scrape_fullres(driver: Driver, data):
    """Click into Google Images results to get full-res source URLs."""
    found = {}
    cookies_done = False

    for cafe_id, query in PRODUCTS:
        search_url = f"https://www.google.com/search?q={query.replace(' ', '+')}&tbm=isch&hl=es"
        print(f"\n  [{cafe_id}]")
        print(f"    Query: {query}")

        driver.get(search_url)
        time.sleep(3)

        if not cookies_done:
            try:
                btns = driver.select_all('button')
                for btn in btns:
                    txt = (btn.text or '').lower()
                    if 'aceptar' in txt or 'accept' in txt or 'todo' in txt:
                        btn.click()
                        cookies_done = True
                        time.sleep(1)
                        break
            except:
                pass
            time.sleep(2)

        # Approach 1: Extract full-res URLs from page scripts
        # Google Images embeds original URLs in JS/JSON data in <script> tags
        soup = soupify(driver)
        page_html = str(soup)
        
        # Google stores original image URLs in various formats in scripts
        # Pattern: ["https://...",width,height]  or  "ou":"https://..."
        # Also try: data-src attributes on the image detail panel
        
        full_urls = []
        
        # Method A: Look for high-res URLs in script tags  
        # Google embeds them as: ["http(s)://domain.com/path.jpg",width,height]
        for script in soup.select('script'):
            txt = script.string or ''
            # Find URLs that look like product images (not google/gstatic)
            urls = re.findall(r'\["(https?://(?!encrypted-tbn|www\.google|www\.gstatic|lh\d|play\.google)[^"]+\.(?:jpg|jpeg|png|webp)(?:\?[^"]*)?)"[,\]]', txt)
            for u in urls:
                if len(u) > 50 and 'gstatic' not in u:
                    full_urls.append(u)
        
        if full_urls:
            # Pick the first product-relevant URL
            url = full_urls[0]
            found[cafe_id] = url
            print(f"    FOUND (script): {url[:100]}...")
            time.sleep(1)
            continue
        
        # Method B: Click the first image result to open preview, then extract
        print("    Clicking first image result...")
        try:
            # Google Images results are in divs with role="listitem" or in the grid
            # Click on a thumbnail to open the side panel
            thumbnails = driver.select_all('div[data-id] img, #islrg img, div.isv-r img')
            clicked = False
            for thumb in thumbnails[:5]:
                try:
                    src = thumb.get_attribute('src') or ''
                    if 'encrypted-tbn' in src or ('gstatic' in src and len(src) > 60):
                        thumb.click()
                        clicked = True
                        time.sleep(3)
                        break
                except:
                    continue
            
            if clicked:
                # Now the side panel should be open with the full-res image
                soup2 = soupify(driver)
                
                # Look for the large image in the side panel
                # It typically has class 'sFlh5c pT0Scc iPVvYb' or similar, or is in a[href] to source
                for img in soup2.select('img[src]'):
                    src = img.get('src', '')
                    if src.startswith('http') and 'encrypted-tbn' not in src and 'gstatic.com' not in src:
                        if len(src) > 50:
                            full_urls.append(src)
                
                # Also check data-src
                for img in soup2.select('img[data-src]'):
                    src = img.get('data-src', '')
                    if src.startswith('http') and 'encrypted-tbn' not in src and 'gstatic.com' not in src:
                        if len(src) > 50:
                            full_urls.append(src)
                
                if full_urls:
                    url = full_urls[0]
                    found[cafe_id] = url
                    print(f"    FOUND (click): {url[:100]}...")
                    time.sleep(1)
                    continue
        except Exception as e:
            print(f"    Click error: {e}")
        
        # Method C: Fall back to the thumbnail (already uploaded, skip)
        print("    NO FULL-RES FOUND - keeping existing thumbnail")
        time.sleep(1)

    return found


if __name__ == "__main__":
    print("=== Scraping full-res Alipende images (10 products) ===\n")
    results = scrape_fullres() or {}

    outpath = os.path.join("scripts", "alipende_fullres.json")
    with open(outpath, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved {len(results)} to {outpath}")
    
    # Show summary
    for k, v in results.items():
        short_id = k.replace("ahorramas_alipende_", "")
        print(f"  {short_id}: {v[:80]}...")
