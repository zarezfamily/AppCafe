"""
Scrape individual product pages on Ahorramas for unique Alipende photos.
Instead of scraping search tiles, click into each product page to get the hero image.
"""
from botasaurus.browser import browser, Driver
from botasaurus.soupify import soupify
import json, os, time, re

# Search queries designed to find specific products
PRODUCT_SEARCHES = [
    # (search_query, expected_title_fragment, cafe_id)
    ("alipende molido natural 250", "molido alipende 250g tueste natural", "ahorramas_alipende_molido_natural_250"),
    ("alipende molido mezcla 250", "molido alipende 250g mezcla", "ahorramas_alipende_molido_mezcla_250"),
    ("alipende molido descafeinado 250", "descafeinado alipende 250g", "ahorramas_alipende_molido_descaf_250"),
    ("alipende molido colombia", "molido alipende 250g colombia", "ahorramas_alipende_molido_colombia_250"),
    ("alipende molido natural 500", "molido alipende 500g", "ahorramas_alipende_molido_natural_500"),
    ("alipende grano natural 500", "grano alipende", "ahorramas_alipende_grano_natural_500"),
    ("alipende grano natural 1kg", "grano alipende", "ahorramas_alipende_grano_natural_1kg"),
    ("alipende grano mezcla", "grano.*mezcla", "ahorramas_alipende_grano_mezcla_1kg"),
    ("alipende grano descafeinado", "grano.*descaf", "ahorramas_alipende_grano_descaf_500"),
    ("alipende capsulas intenso nespresso", "cápsulas.*intenso.*nespresso|intenso.*cápsulas", "ahorramas_alipende_capsulas_intenso_nesp_10"),
    ("alipende capsulas espresso nespresso", "cápsulas.*espresso|espresso.*cápsulas", "ahorramas_alipende_capsulas_espresso_nesp_10"),
    ("alipende capsulas descafeinado nespresso", "cápsulas.*descaf.*nespresso", "ahorramas_alipende_capsulas_descaf_nesp_10"),
    ("alipende capsulas lungo nespresso", "cápsulas.*lungo|lungo.*cápsulas", "ahorramas_alipende_capsulas_lungo_nesp_10"),
    ("alipende capsulas colombia nespresso", "cápsulas.*colombia|colombia.*cápsulas", "ahorramas_alipende_capsulas_colombia_nesp_10"),
    ("alipende capsulas intenso 20", "cápsulas.*intenso.*20|intenso.*20", "ahorramas_alipende_capsulas_intenso_nesp_20"),
    ("alipende capsulas espresso dolce gusto", "cápsulas.*espresso.*dolce|dolce.*espresso", "ahorramas_alipende_capsulas_espresso_dg_16"),
    ("alipende capsulas intenso dolce gusto", "cápsulas.*intenso.*dolce|dolce.*intenso", "ahorramas_alipende_capsulas_intenso_dg_16"),
    ("alipende capsulas descafeinado dolce gusto", "cápsulas.*descaf.*dolce|dolce.*descaf", "ahorramas_alipende_capsulas_descaf_dg_16"),
    ("alipende soluble natural 200", "soluble alipende 200g", "ahorramas_alipende_soluble_natural_200"),
    ("alipende soluble descafeinado", "soluble alipende descafeinado", "ahorramas_alipende_soluble_descaf_200"),
]

results = {}

@browser(headless=False, block_images=False, reuse_driver=True)
def scrape_product_pages(driver: Driver, data):
    """Navigate to Ahorramas, find each product, click into its detail page, get the hero image."""
    found = {}
    cookies_done = False
    
    for search_q, title_hint, cafe_id in PRODUCT_SEARCHES:
        url = f"https://www.ahorramas.com/buscador?q={search_q.replace(' ', '+')}"
        print(f"\n--- {cafe_id} ---")
        print(f"  Search: {url}")
        driver.get(url)
        time.sleep(4)
        
        if not cookies_done:
            try:
                btns = driver.select_all('button')
                for btn in btns:
                    txt = (btn.text or '').lower()
                    if 'aceptar' in txt or 'accept' in txt:
                        btn.click()
                        cookies_done = True
                        time.sleep(1)
                        break
            except:
                pass
        
        time.sleep(2)
        
        # Find product links
        soup = soupify(driver)
        links = soup.select('a[href*="/producto/"]')
        
        best_link = None
        best_score = 0
        
        for link in links:
            href = link.get('href', '')
            text = (link.get_text() or '').lower().strip()
            
            if 'alipende' not in text and 'alipende' not in href:
                continue
            if 'café' not in text and 'cafe' not in text and 'capsul' not in text.replace('á','a'):
                continue
            
            # Score this link
            score = 0
            id_parts = cafe_id.replace("ahorramas_alipende_", "").split("_")
            for p in id_parts:
                if p in text or p in text.replace('á','a').replace('é','e').replace('í','i'):
                    score += 1
            
            # Bonus for key characteristics
            if "molido" in cafe_id and "molido" in text: score += 3
            elif "grano" in cafe_id and "grano" in text: score += 3
            elif "capsulas" in cafe_id and ("cápsulas" in text or "capsulas" in text): score += 3
            elif "soluble" in cafe_id and "soluble" in text: score += 3
            
            if "descaf" in cafe_id and "descaf" in text: score += 3
            elif "mezcla" in cafe_id and "mezcla" in text: score += 3
            elif "colombia" in cafe_id and "colombia" in text: score += 3
            elif "intenso" in cafe_id and "intenso" in text: score += 3
            elif "espresso" in cafe_id and "espresso" in text: score += 3
            elif "lungo" in cafe_id and "lungo" in text: score += 3
            elif "natural" in cafe_id and "natural" in text and "descaf" not in cafe_id: score += 2
            
            if "nesp" in cafe_id and "nespresso" in text: score += 2
            elif "dg" in cafe_id and ("dolce" in text or "gusto" in text): score += 2
            
            # Weight match
            if "250" in cafe_id and "250" in text: score += 2
            elif "500" in cafe_id and "500" in text: score += 2
            elif "1kg" in cafe_id and ("1kg" in text or "1000" in text): score += 2
            elif "200" in cafe_id and "200" in text: score += 2
            
            if score > best_score:
                best_score = score
                best_link = href
                print(f"    Candidate ({score}): {text[:60]} -> {href[:60]}")
        
        if not best_link:
            print(f"  NO product link found")
            continue
            
        # Navigate to product page
        full_url = best_link if best_link.startswith('http') else f"https://www.ahorramas.com{best_link}"
        print(f"  Navigating to: {full_url[:80]}")
        driver.get(full_url)
        time.sleep(4)
        
        # Extract hero image from product detail page
        soup = soupify(driver)
        
        # Try different selectors for the main product image
        hero_img = None
        selectors = [
            '.product-detail img.primary-image',
            '.product-detail__image img',
            '.pdp-main-image img',
            '[class*="product-detail"] img[src*="BFNH_PRD"]',
            'img.primary-image',
            '.carousel img[src*="BFNH_PRD"]',
            'img[src*="BFNH_PRD"][src*="large"]',
            'img[src*="BFNH_PRD"]',
        ]
        
        for sel in selectors:
            imgs = soup.select(sel)
            for img in imgs:
                src = img.get('src') or img.get('data-src') or ''
                if 'BFNH_PRD' in src and len(src) > 50:
                    # Get high-res version
                    hero_img = src.split('?')[0] + '?sw=800&sh=800&sm=fit'
                    break
            if hero_img:
                break
        
        if not hero_img:
            # Try any large image on the page
            all_imgs = soup.select('img[src*="ahorramas.com/dw/image"]')
            for img in all_imgs:
                src = img.get('src', '')
                if 'BFNH_PRD' in src:
                    hero_img = src.split('?')[0] + '?sw=800&sh=800&sm=fit'
                    break
        
        if hero_img:
            found[cafe_id] = hero_img
            print(f"  FOUND: {hero_img[:80]}")
        else:
            print(f"  NO hero image on product page")
        
        time.sleep(1)
    
    return found


if __name__ == "__main__":
    print("=== Scraping Alipende product pages ===")
    r = scrape_product_pages() or {}
    results.update(r)
    
    outpath = os.path.join("scripts", "alipende_pdp_photos.json")
    with open(outpath, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved {len(results)} to {outpath}")
    
    # Check uniqueness
    url_to_ids = {}
    for k, v in results.items():
        base = v.split('?')[0]
        if base not in url_to_ids:
            url_to_ids[base] = []
        url_to_ids[base].append(k.replace("ahorramas_alipende_", ""))
    
    unique = sum(1 for ids in url_to_ids.values() if len(ids) == 1)
    shared = sum(1 for ids in url_to_ids.values() if len(ids) > 1)
    print(f"\nUnique images: {unique}, Shared groups: {shared}")
    for url, ids in url_to_ids.items():
        if len(ids) > 1:
            print(f"  SHARED ({len(ids)}): {', '.join(ids)}")
