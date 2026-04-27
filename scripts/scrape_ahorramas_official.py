"""
Scrape OFFICIAL product images for all Alipende coffees directly from Ahorramas.
Strategy:
1. Visit the filtered listing page to get all product page URLs
2. Visit each product page to get the high-resolution main image
3. Map each to our Firestore docId
"""
from botasaurus.browser import browser, Driver
from botasaurus.soupify import soupify
import json, os, time, re

# Mapping of our Firestore docIds to Ahorramas product codes/keywords for matching
DOC_ID_KEYWORDS = {
    "ahorramas_alipende_molido_natural_250": ["molido", "250", "natural", "tueste natural"],
    "ahorramas_alipende_molido_mezcla_250": ["molido", "250", "mezcla"],
    "ahorramas_alipende_molido_descaf_250": ["molido", "250", "descafeinado", "tueste natural"],
    "ahorramas_alipende_molido_colombia_250": ["molido", "250", "colombia"],
    "ahorramas_alipende_molido_natural_500": ["molido", "500", "natural"],
    "ahorramas_alipende_grano_natural_500": ["grano", "500", "natural"],
    "ahorramas_alipende_grano_natural_1kg": ["grano", "1kg", "natural"],
    "ahorramas_alipende_grano_mezcla_1kg": ["grano", "1kg", "mezcla"],
    "ahorramas_alipende_grano_descaf_500": ["grano", "500", "descafeinado"],
    "ahorramas_alipende_capsulas_intenso_nesp_10": ["capsul", "intenso", "nespresso", "10"],
    "ahorramas_alipende_capsulas_espresso_nesp_10": ["capsul", "espresso", "nespresso", "10"],
    "ahorramas_alipende_capsulas_descaf_nesp_10": ["capsul", "descafeinado", "nespresso", "10"],
    "ahorramas_alipende_capsulas_lungo_nesp_10": ["capsul", "lungo", "nespresso", "10"],
    "ahorramas_alipende_capsulas_colombia_nesp_10": ["capsul", "colombia", "nespresso", "10"],
    "ahorramas_alipende_capsulas_intenso_nesp_20": ["capsul", "intenso", "nespresso", "20"],
    "ahorramas_alipende_capsulas_espresso_dg_16": ["capsul", "espresso", "dolce gusto", "16"],
    "ahorramas_alipende_capsulas_intenso_dg_16": ["capsul", "intenso", "dolce gusto", "16"],
    "ahorramas_alipende_capsulas_descaf_dg_16": ["capsul", "descafeinado", "dolce gusto", "16"],
    "ahorramas_alipende_soluble_natural_200": ["soluble", "200", "natural"],
    "ahorramas_alipende_soluble_descaf_200": ["soluble", "200", "descafeinado"],
}

# Ahorramas filter pages for Alipende coffee
LISTING_URLS = [
    # Main cafe filter
    "https://www.ahorramas.com/alimentacion/cacao-cafes-e-infusiones/?pmin=0.01&prefn1=akeneo_tipoDeProducto&prefn2=brand&prefv1=Cafe&prefv2=ALIPENDE&start=0&sz=60",
    # Capsulas filter 
    "https://www.ahorramas.com/alimentacion/cacao-cafes-e-infusiones/?pmin=0.01&prefn1=akeneo_tipoDeProducto&prefn2=brand&prefv1=Capsulas%20cafe&prefv2=ALIPENDE&start=0&sz=60",
    # Soluble filter
    "https://www.ahorramas.com/alimentacion/cacao-cafes-e-infusiones/?pmin=0.01&prefn1=akeneo_tipoDeProducto&prefn2=brand&prefv1=Cafe%20soluble&prefv2=ALIPENDE&start=0&sz=60",
]

def match_product_to_docid(product_name):
    """Match an Ahorramas product name to our docId."""
    name_lower = product_name.lower()
    
    best_match = None
    best_score = 0
    
    for doc_id, keywords in DOC_ID_KEYWORDS.items():
        score = 0
        for kw in keywords:
            if kw.lower() in name_lower:
                score += 1
        
        # Must match at least 2 keywords
        if score > best_score and score >= 2:
            best_score = score
            best_match = doc_id
    
    return best_match, best_score

@browser(headless=False, block_images=False, reuse_driver=True)
def scrape_ahorramas_official(driver: Driver, data):
    """Visit Ahorramas listing and product pages to get official images."""
    results = {}
    product_pages = {}  # url -> name
    cookies_done = False
    
    # Step 1: Collect all product page URLs from listing pages
    for listing_url in LISTING_URLS:
        print(f"\n--- Listing: {listing_url[:80]}...")
        driver.get(listing_url)
        time.sleep(4)
        
        if not cookies_done:
            try:
                btns = driver.select_all('button')
                for btn in btns:
                    txt = (btn.text or '').lower()
                    if 'aceptar' in txt or 'accept' in txt or 'todo' in txt:
                        btn.click()
                        cookies_done = True
                        time.sleep(2)
                        break
            except:
                pass
            time.sleep(2)
        
        soup = soupify(driver)
        
        # Find product tiles - Ahorramas uses various selectors
        # Look for links containing "alipende" in the URL or product name
        for a in soup.select('a[href*="alipende"], a[href*="ALIPENDE"]'):
            href = a.get('href', '')
            text = a.get_text(strip=True)
            if href.endswith('.html') and 'alipende' in href.lower():
                if href not in product_pages:
                    # Make absolute URL
                    if not href.startswith('http'):
                        href = 'https://www.ahorramas.com' + href
                    product_pages[href] = text
                    print(f"  Found: {text[:60]} -> {href}")
        
        # Also try product tile approach
        for tile in soup.select('.product-tile, .product, [data-pid]'):
            links = tile.select('a[href*=".html"]')
            for a in links:
                href = a.get('href', '')
                text = a.get_text(strip=True)
                if 'alipende' in (href + text).lower() and href.endswith('.html'):
                    if not href.startswith('http'):
                        href = 'https://www.ahorramas.com' + href
                    if href not in product_pages:
                        product_pages[href] = text
                        print(f"  Found (tile): {text[:60]} -> {href}")
    
    print(f"\n=== Found {len(product_pages)} product pages ===\n")
    
    # Step 2: Visit each product page and extract the main high-res image
    for url, name in product_pages.items():
        print(f"\n  Visiting: {name[:60]}")
        print(f"    URL: {url}")
        
        driver.get(url)
        time.sleep(3)
        
        soup = soupify(driver)
        
        # Find the main product image
        # Ahorramas uses various image containers
        img_url = None
        
        # Try: main product image (usually in a carousel or hero)
        for selector in [
            '.primary-images img',
            '.product-detail img',
            '.pdp-image img',
            'img.product-image',
            '#pdpCarousel img',
            '.carousel-item img',
            'img[itemprop="image"]',
            '.product-image-container img',
            'picture source',
            'img.lazyload',
        ]:
            imgs = soup.select(selector)
            for img in imgs:
                src = img.get('src') or img.get('data-src') or img.get('srcset', '').split(',')[0].strip().split(' ')[0]
                if src and ('ahorramas' in src or 'demandware' in src) and len(src) > 30:
                    # Skip tiny icons
                    if 'icon' in src.lower() or 'logo' in src.lower():
                        continue
                    if not src.startswith('http'):
                        src = 'https://www.ahorramas.com' + src
                    img_url = src
                    break
            if img_url:
                break
        
        # If not found, try any large image on the page
        if not img_url:
            for img in soup.select('img'):
                src = img.get('src', '')
                if 'ahorramas' in src and ('BFNH_PRD' in src or 'Assets/' in src):
                    if not src.startswith('http'):
                        src = 'https://www.ahorramas.com' + src
                    img_url = src
                    break
        
        if img_url:
            # Try to get highest resolution: modify Ahorramas demandware URL params
            # Pattern: ?sw=XXX&sh=XXX -> increase to 2400
            if 'demandware' in img_url and ('sw=' in img_url or 'sh=' in img_url):
                img_url = re.sub(r'sw=\d+', 'sw=2400', img_url)
                img_url = re.sub(r'sh=\d+', 'sh=2400', img_url)
            elif 'demandware' in img_url and '?' not in img_url:
                img_url += '?sw=2400&sh=2400'
            
            # Match to our docId
            doc_id, score = match_product_to_docid(name)
            if doc_id:
                results[doc_id] = img_url
                print(f"    IMAGE: {img_url[:100]}...")
                print(f"    MATCHED: {doc_id} (score: {score})")
            else:
                print(f"    IMAGE: {img_url[:100]}...")
                print(f"    NO MATCH for: {name}")
        else:
            print(f"    NO IMAGE FOUND")
        
        time.sleep(2)
    
    return results


if __name__ == "__main__":
    print("=== Scraping official Alipende photos from Ahorramas ===\n")
    results = scrape_ahorramas_official() or {}

    outpath = os.path.join("scripts", "alipende_official.json")
    with open(outpath, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\n=== Saved {len(results)} official images to {outpath} ===")
    
    # Show summary
    for doc_id in sorted(DOC_ID_KEYWORDS.keys()):
        short = doc_id.replace("ahorramas_alipende_", "")
        if doc_id in results:
            print(f"  OK  {short}: {results[doc_id][:80]}...")
        else:
            print(f"  --  {short}: not found")
    
    found = len(results)
    total = len(DOC_ID_KEYWORDS)
    print(f"\nFound: {found}/{total}")
