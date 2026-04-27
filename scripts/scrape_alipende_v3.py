"""
Scrape unique Alipende product images from Ahorramas.
Searches for each product individually and extracts the specific product image.
"""
from botasaurus.browser import browser, Driver
from botasaurus.soupify import soupify
import json, os, time, re

# Each product with a very specific search query
PRODUCTS = {
    "ahorramas_alipende_molido_natural_250": "alipende molido natural 250",
    "ahorramas_alipende_molido_mezcla_250": "alipende molido mezcla 250",
    "ahorramas_alipende_molido_descaf_250": "alipende molido descafeinado 250",
    "ahorramas_alipende_molido_colombia_250": "alipende molido colombia 250",
    "ahorramas_alipende_molido_natural_500": "alipende molido natural 500",
    "ahorramas_alipende_grano_natural_500": "alipende grano natural 500",
    "ahorramas_alipende_grano_natural_1kg": "alipende grano natural 1kg",
    "ahorramas_alipende_grano_mezcla_1kg": "alipende grano mezcla 1kg",
    "ahorramas_alipende_grano_descaf_500": "alipende grano descafeinado 500",
    "ahorramas_alipende_capsulas_intenso_nesp_10": "alipende capsulas intenso nespresso 10",
    "ahorramas_alipende_capsulas_espresso_nesp_10": "alipende capsulas espresso nespresso 10",
    "ahorramas_alipende_capsulas_descaf_nesp_10": "alipende capsulas descafeinado nespresso 10",
    "ahorramas_alipende_capsulas_lungo_nesp_10": "alipende capsulas lungo nespresso 10",
    "ahorramas_alipende_capsulas_colombia_nesp_10": "alipende capsulas colombia nespresso 10",
    "ahorramas_alipende_capsulas_intenso_nesp_20": "alipende capsulas intenso 20",
    "ahorramas_alipende_capsulas_espresso_dg_16": "alipende capsulas espresso dolce gusto",
    "ahorramas_alipende_capsulas_intenso_dg_16": "alipende capsulas intenso dolce gusto",
    "ahorramas_alipende_capsulas_descaf_dg_16": "alipende capsulas descafeinado dolce gusto",
    "ahorramas_alipende_soluble_natural_200": "alipende soluble natural 200",
    "ahorramas_alipende_soluble_descaf_200": "alipende soluble descafeinado 200",
}

results = {}

@browser(headless=False, block_images=False, reuse_driver=True)
def scrape_all(driver: Driver, data):
    """Load Ahorramas search and extract ALL product tiles."""
    found = {}
    all_tiles = []  # (name, img_url) from Ahorramas
    
    searches = [
        "cafe+alipende",
        "alipende+capsulas",
        "alipende+soluble",
    ]
    
    cookies_accepted = False
    
    for query in searches:
        url = f"https://www.ahorramas.com/buscador?q={query}"
        print(f"\n  Searching: {url}")
        driver.get(url)
        time.sleep(5)
        
        if not cookies_accepted:
            try:
                btns = driver.select_all('button')
                for btn in btns:
                    txt = (btn.text or '').lower()
                    if 'aceptar' in txt or 'accept' in txt:
                        btn.click()
                        cookies_accepted = True
                        time.sleep(1)
                        break
            except:
                pass
        
        time.sleep(2)
        # Scroll extensively to load all products
        for _ in range(8):
            driver.run_js("window.scrollBy(0, 600)")
            time.sleep(0.8)
        
        soup = soupify(driver)
        tiles = soup.select('.product-card, .product, [class*="product"], article, .js-product-tile')
        
        for tile in tiles:
            img = tile.select_one('img')
            if not img:
                continue
            src = img.get('src') or img.get('data-src') or ''
            alt = (img.get('alt') or '').lower().strip()
            
            # Get product name from title/link
            name_el = tile.select_one('h2, h3, .title, .name, [class*="name"], [class*="title"], a[href*="/product"]')
            name = (name_el.get_text().strip() if name_el else alt).lower()
            
            if not src or 'logo' in src or 'icon' in src or len(src) < 30:
                continue
            if 'alipende' not in name and 'alipende' not in alt:
                continue
                
            # Get high-res version
            if 'sw=260' in src:
                src = src.split('?')[0] + '?sw=800&sh=800&sm=fit'
            
            all_tiles.append((name, alt, src))
            print(f"    Tile: {name[:60]} -> {src[:80]}")
    
    print(f"\n  Total Ahorramas tiles: {len(all_tiles)}")
    
    # Now match each product ID to the best tile
    for cafe_id, query in PRODUCTS.items():
        short = cafe_id.replace("ahorramas_alipende_", "")
        parts = short.split("_")
        
        best_match = None
        best_score = 0
        
        for name, alt, src in all_tiles:
            combined = name + " " + alt
            score = 0
            
            for p in parts:
                if p in combined:
                    score += 1
            
            # Bonus for exact weight match
            if "250" in short and "250" in combined: score += 2
            elif "500" in short and "500" in combined: score += 2
            elif "1kg" in short and ("1kg" in combined or "1000" in combined): score += 2
            elif "200" in short and "200" in combined: score += 2
            
            # Bonus for format match
            if "molido" in short and "molido" in combined: score += 2
            elif "grano" in short and "grano" in combined: score += 2
            elif "capsulas" in short and ("cápsulas" in combined or "capsulas" in combined): score += 2
            elif "soluble" in short and "soluble" in combined: score += 2
            
            # Bonus for type match
            if "descaf" in short and "descaf" in combined: score += 3
            elif "mezcla" in short and "mezcla" in combined: score += 3
            elif "colombia" in short and "colombia" in combined: score += 3
            elif "intenso" in short and "intenso" in combined: score += 3
            elif "espresso" in short and "espresso" in combined: score += 3
            elif "lungo" in short and "lungo" in combined: score += 3
            elif "natural" in short and "natural" in combined and "descaf" not in short: score += 2
            
            # Bonus for system match (nesp vs dg)
            if "nesp" in short and ("nespresso" in combined or "nesp" in combined): score += 2
            elif "dg" in short and ("dolce" in combined or "gusto" in combined): score += 2
            
            # Penalty if wrong format
            if "molido" in short and "grano" in combined and "molido" not in combined: score -= 5
            if "grano" in short and "molido" in combined and "grano" not in combined: score -= 5
            if "capsulas" in short and ("molido" in combined or "grano" in combined): score -= 3
            if "soluble" in short and ("molido" in combined or "grano" in combined): score -= 3
            
            if score > best_score:
                best_score = score
                best_match = src
        
        if best_match and best_score >= 3:
            found[cafe_id] = best_match
            print(f"  MATCH ({best_score}): {cafe_id} -> {best_match[:80]}")
        else:
            print(f"  MISS ({best_score}): {cafe_id}")
    
    return found

if __name__ == "__main__":
    print("=== Scraping unique Alipende photos from Ahorramas ===")
    r = scrape_all() or {}
    results.update(r)
    
    outpath = os.path.join("scripts", "alipende_unique_photos.json")
    with open(outpath, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved {len(results)} URLs to {outpath}")
    
    # Show duplicates
    url_to_ids = {}
    for k, v in results.items():
        base = v.split('?')[0]
        if base not in url_to_ids:
            url_to_ids[base] = []
        url_to_ids[base].append(k.replace("ahorramas_alipende_", ""))
    
    print(f"\nUnique images: {len(url_to_ids)}")
    for url, ids in url_to_ids.items():
        if len(ids) > 1:
            print(f"  SHARED ({len(ids)}): {', '.join(ids)}")
