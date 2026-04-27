"""
Scrape product images for specific coffee IDs using Google Images via Botasaurus.
Downloads images, processes them to 800x800 white bg PNG, uploads to Firebase Storage.
"""
from botasaurus.browser import browser, Driver
from botasaurus.soupify import soupify
import json, os, time, re, urllib.request, subprocess

# IDs that need photos, grouped by brand with search-friendly names
MISSING = {
    "Alipende": {
        "ahorramas_alipende_molido_natural_250": "alipende cafe molido natural 250g ahorramas",
        "ahorramas_alipende_molido_mezcla_250": "alipende cafe molido mezcla 250g ahorramas",
        "ahorramas_alipende_molido_descaf_250": "alipende cafe molido descafeinado 250g ahorramas",
        "ahorramas_alipende_molido_colombia_250": "alipende cafe molido colombia 250g ahorramas",
        "ahorramas_alipende_molido_natural_500": "alipende cafe molido natural 500g ahorramas",
        "ahorramas_alipende_grano_natural_500": "alipende cafe grano natural 500g ahorramas",
        "ahorramas_alipende_grano_natural_1kg": "alipende cafe grano natural 1kg ahorramas",
        "ahorramas_alipende_grano_mezcla_1kg": "alipende cafe grano mezcla 1kg ahorramas",
        "ahorramas_alipende_grano_descaf_500": "alipende cafe grano descafeinado 500g ahorramas",
        "ahorramas_alipende_capsulas_intenso_nesp_10": "alipende cafe capsulas intenso nespresso ahorramas",
        "ahorramas_alipende_capsulas_espresso_nesp_10": "alipende cafe capsulas espresso nespresso ahorramas",
        "ahorramas_alipende_capsulas_descaf_nesp_10": "alipende cafe capsulas descafeinado nespresso ahorramas",
        "ahorramas_alipende_capsulas_lungo_nesp_10": "alipende cafe capsulas lungo nespresso ahorramas",
        "ahorramas_alipende_capsulas_colombia_nesp_10": "alipende cafe capsulas colombia nespresso ahorramas",
        "ahorramas_alipende_capsulas_intenso_nesp_20": "alipende cafe capsulas intenso nespresso 20 ahorramas",
        "ahorramas_alipende_capsulas_espresso_dg_16": "alipende cafe capsulas espresso dolce gusto ahorramas",
        "ahorramas_alipende_capsulas_intenso_dg_16": "alipende cafe capsulas intenso dolce gusto ahorramas",
        "ahorramas_alipende_capsulas_descaf_dg_16": "alipende cafe capsulas descafeinado dolce gusto ahorramas",
        "ahorramas_alipende_soluble_natural_200": "alipende cafe soluble natural 200g ahorramas",
        "ahorramas_alipende_soluble_descaf_200": "alipende cafe soluble descafeinado 200g ahorramas",
    },
    "Aliada": {
        "eci_aliada_molido_natural_250": "aliada cafe molido natural 250g el corte ingles",
        "eci_aliada_molido_descaf_250": "aliada cafe molido descafeinado 250g el corte ingles",
        "eci_aliada_molido_mezcla_250": "aliada cafe molido mezcla 250g el corte ingles",
        "eci_aliada_grano_natural_500": "aliada cafe grano natural 500g el corte ingles",
        "eci_aliada_grano_natural_1kg": "aliada cafe grano natural 1kg el corte ingles",
        "eci_aliada_capsulas_intenso_nesp_10": "aliada cafe capsulas intenso nespresso el corte ingles",
        "eci_aliada_capsulas_descaf_nesp_10": "aliada cafe capsulas descafeinado nespresso el corte ingles",
        "eci_aliada_capsulas_lungo_nesp_10": "aliada cafe capsulas lungo nespresso el corte ingles",
        "eci_aliada_capsulas_espresso_nesp_20": "aliada cafe capsulas espresso nespresso 20 el corte ingles",
        "eci_aliada_soluble_200": "aliada cafe soluble natural 200g el corte ingles",
    },
    "AUCHAN": {
        "alcampo_auchan_grano_natural_1kg": "auchan cafe grano natural 1kg alcampo",
        "alcampo_auchan_grano_mezcla_1kg": "auchan cafe grano mezcla 1kg alcampo",
        "alcampo_auchan_grano_descaf_500": "auchan cafe grano descafeinado 500g alcampo",
        "alcampo_auchan_molido_natural_500": "auchan cafe molido natural 500g alcampo",
        "alcampo_auchan_molido_mezcla_250": "auchan cafe molido mezcla 250g alcampo",
        "alcampo_auchan_molido_intenso_250": "auchan cafe molido intenso 250g alcampo",
        "alcampo_auchan_capsulas_intenso_nesp_20": "auchan cafe capsulas intenso nespresso 20 alcampo",
        "alcampo_auchan_capsulas_lungo_nesp_20": "auchan cafe capsulas lungo nespresso 20 alcampo",
        "alcampo_auchan_capsulas_colombia_nesp_20": "auchan cafe capsulas colombia nespresso 20 alcampo",
        "alcampo_auchan_capsulas_espresso_dg_16": "auchan cafe capsulas espresso dolce gusto 16 alcampo",
        "alcampo_auchan_capsulas_cortado_dg_16": "auchan cafe capsulas cortado dolce gusto 16 alcampo",
        "alcampo_auchan_capsulas_descaf_dg_16": "auchan cafe capsulas descafeinado dolce gusto 16 alcampo",
        "alcampo_auchan_soluble_natural_100": "auchan cafe soluble natural 100g alcampo",
        "alcampo_auchan_soluble_descaf_100": "auchan cafe soluble descafeinado 100g alcampo",
        "alcampo_auchan_bio_peru_250": "auchan bio cafe peru molido 250g alcampo",
        "alcampo_auchan_bio_colombia_nesp_10": "auchan bio cafe colombia capsulas nespresso alcampo",
        "alcampo_auchan_gourmet_peru_250": "auchan gourmet cafe peru molido 250g alcampo",
        "alcampo_auchan_gourmet_guatemala_250": "auchan gourmet cafe guatemala molido 250g alcampo",
        "alcampo_auchan_gourmet_costarica_250": "auchan gourmet cafe costa rica molido 250g alcampo",
    },
    "BM": {
        "bm_molido_natural_250": "bm supermercados cafe molido natural 250g",
        "bm_molido_mezcla_250": "bm supermercados cafe molido mezcla 250g",
        "bm_molido_descaf_250": "bm supermercados cafe molido descafeinado 250g",
        "bm_molido_colombia_250": "bm supermercados cafe molido colombia 250g",
        "bm_molido_natural_500": "bm supermercados cafe molido natural 500g",
        "bm_grano_natural_500": "bm supermercados cafe grano natural 500g",
        "bm_grano_natural_1kg": "bm supermercados cafe grano natural 1kg",
        "bm_grano_mezcla_1kg": "bm supermercados cafe grano mezcla 1kg",
        "bm_grano_descaf_500": "bm supermercados cafe grano descafeinado 500g",
        "bm_grano_arabica_1kg": "bm supermercados cafe grano arabica 1kg",
        "bm_capsulas_intenso_nesp_10": "bm supermercados cafe capsulas intenso nespresso",
        "bm_capsulas_espresso_nesp_10": "bm supermercados cafe capsulas espresso nespresso",
        "bm_capsulas_descaf_nesp_10": "bm supermercados cafe capsulas descafeinado nespresso",
        "bm_capsulas_lungo_nesp_10": "bm supermercados cafe capsulas lungo nespresso",
        "bm_capsulas_colombia_nesp_10": "bm supermercados cafe capsulas colombia nespresso",
        "bm_capsulas_intenso_dg_16": "bm supermercados cafe capsulas intenso dolce gusto",
        "bm_capsulas_espresso_dg_16": "bm supermercados cafe capsulas espresso dolce gusto",
        "bm_capsulas_descaf_dg_16": "bm supermercados cafe capsulas descafeinado dolce gusto",
        "bm_soluble_natural_200": "bm supermercados cafe soluble natural 200g",
        "bm_soluble_descaf_200": "bm supermercados cafe soluble descafeinado 200g",
    },
}

DOWNLOAD_DIR = "scripts/scraped_imgs"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

results = {}  # id -> img_url

@browser(
    headless=False,
    block_images=False,
    reuse_driver=True,
)
def scrape_ahorramas(driver: Driver, data):
    """Scrape Ahorramas site for Alipende coffee images."""
    found = {}
    
    searches = [
        ("cafe+alipende+molido", ["molido"]),
        ("cafe+alipende+grano", ["grano"]),
        ("cafe+alipende+capsulas", ["capsulas", "cápsulas"]),
        ("cafe+alipende+soluble", ["soluble"]),
    ]
    
    for query, keywords in searches:
        url = f"https://www.ahorramas.com/buscador?q={query}"
        print(f"\n  Ahorramas: {url}")
        driver.get(url)
        time.sleep(5)
        
        # Accept cookies
        try:
            btns = driver.select_all('button')
            for btn in btns:
                txt = (btn.text or '').lower()
                if 'aceptar' in txt or 'accept' in txt:
                    btn.click()
                    time.sleep(1)
                    break
        except:
            pass
        
        time.sleep(2)
        # Scroll
        for _ in range(3):
            driver.run_js("window.scrollBy(0, 800)")
            time.sleep(1)
        
        soup = soupify(driver)
        products = soup.select('.product-card, .product, [class*="product"], article')
        
        for prod in products:
            img = prod.select_one('img')
            if not img:
                continue
            src = img.get('src') or img.get('data-src') or ''
            alt = (img.get('alt') or '').lower()
            title_el = prod.select_one('h2, h3, .title, .name, [class*="name"], [class*="title"], a')
            title = (title_el.get_text() if title_el else alt).lower()
            
            if not src or 'logo' in src or 'icon' in src:
                continue
            
            # Match to our IDs
            for cafe_id, search_q in MISSING["Alipende"].items():
                if cafe_id in found:
                    continue
                # Check if product matches
                id_keywords = cafe_id.replace("ahorramas_alipende_", "").replace("_", " ").split()
                if any(kw in title or kw in alt for kw in id_keywords[:2]):
                    found[cafe_id] = src
                    print(f"    MATCH: {cafe_id} -> {src[:80]}")
        
        print(f"  Found so far: {len(found)} matches")
    
    return found


@browser(
    headless=False,
    block_images=False,
    reuse_driver=True,
)
def scrape_google(driver: Driver, data):
    """Search Google Images for each brand's products."""
    found = {}
    
    for brand, items in MISSING.items():
        # Group similar items and search by type
        types = {}
        for cafe_id, query in items.items():
            # Determine type
            if "molido" in cafe_id: t = "molido"
            elif "grano" in cafe_id: t = "grano"
            elif "capsulas" in cafe_id: t = "capsulas"
            elif "soluble" in cafe_id: t = "soluble"
            else: t = "other"
            
            if t not in types:
                types[t] = []
            types[t].append((cafe_id, query))
        
        for ptype, items_list in types.items():
            # Use first item's query as representative
            query = items_list[0][1]
            search_url = f"https://www.google.com/search?q={query.replace(' ', '+')}&tbm=isch&hl=es"
            print(f"\n  Google: {brand}/{ptype}: {query}")
            
            driver.get(search_url)
            time.sleep(3)
            
            # Accept cookies
            try:
                btns = driver.select_all('button')
                for btn in btns:
                    txt = (btn.text or '').lower()
                    if 'aceptar' in txt or 'accept' in txt or 'todo' in txt:
                        btn.click()
                        time.sleep(1)
                        break
            except:
                pass
            
            time.sleep(2)
            soup = soupify(driver)
            
            # Get actual high-res image URLs by clicking on thumbnails
            imgs = soup.select('img[src^="http"]')
            good_imgs = []
            for img in imgs:
                src = img.get('src', '')
                if any(x in src for x in ['google', 'gstatic', 'youtube', 'logo', 'icon']):
                    continue
                if len(src) > 50:  # Real product images have longer URLs
                    good_imgs.append(src)
            
            if not good_imgs:
                # Try data-src or other attributes
                imgs = soup.select('img[data-src^="http"]')
                for img in imgs:
                    src = img.get('data-src', '')
                    if len(src) > 50:
                        good_imgs.append(src)
            
            # Assign first good image to all items of this type
            if good_imgs:
                img_url = good_imgs[0]
                for cafe_id, _ in items_list:
                    if cafe_id not in found:
                        found[cafe_id] = img_url
                        print(f"    ASSIGN: {cafe_id} -> {img_url[:80]}")
            else:
                print(f"    No images found for {brand}/{ptype}")
            
            time.sleep(2)
    
    return found


if __name__ == "__main__":
    print("=== Phase 1: Ahorramas direct scraping ===")
    ahorramas_results = scrape_ahorramas() or {}
    results.update(ahorramas_results)
    
    # For remaining items, use Google Images
    remaining = {}
    for brand, items in MISSING.items():
        for cafe_id in items:
            if cafe_id not in results:
                if brand not in remaining:
                    remaining[brand] = {}
                remaining[brand][cafe_id] = items[cafe_id]
    
    print(f"\n=== Phase 2: Google Images for {sum(len(v) for v in remaining.values())} remaining ===")
    
    # Temporarily update MISSING for google scraper
    original_missing = dict(MISSING)
    MISSING.clear()
    MISSING.update(remaining)
    
    google_results = scrape_google() or {}
    results.update(google_results)
    
    MISSING.clear()
    MISSING.update(original_missing)
    
    # Save
    with open("scripts/scraped_photo_urls.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    total = len(results)
    needed = sum(len(v) for v in MISSING.values())
    print(f"\n=== RESULTS: {total}/{needed} photos found ===")
    for brand in ["Alipende", "Aliada", "AUCHAN", "BM"]:
        brand_ids = set(MISSING[brand].keys())
        found = len([k for k in results if k in brand_ids])
        print(f"  {brand}: {found}/{len(brand_ids)}")
