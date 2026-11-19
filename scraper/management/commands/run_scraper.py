import time
import random
import requests
from bs4 import BeautifulSoup
from django.core.management.base import BaseCommand
from scraper.models import Offer, ScraperStatus, ScraperLog
from django.utils import timezone
from datetime import timedelta
import os
import re
import json
from scraper.telegram_utils import send_telegram_message, format_offer_message, offer_matches_search
from scraper.models import SavedSearch

def log(message):
    """Prints message and saves it to the ScraperLog model."""
    print(message)
    try:
        ScraperLog.objects.create(message=str(message))
        # Keep only the last 100 logs to prevent DB bloat
        total_logs = ScraperLog.objects.count()
        if total_logs > 100:
            newest_ids = ScraperLog.objects.order_by('-timestamp').values_list('id', flat=True)[:100]
            ScraperLog.objects.exclude(id__in=list(newest_ids)).delete()
    except Exception as e:
        print(f"Error saving log: {e}")

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'pl,en-US;q=0.7,en;q=0.3',
}

FUEL_MAP = {
    'diesel': 'Olej Napędowy',
    'olej napędowy': 'Olej Napędowy',
    'on': 'Olej Napędowy',
    'benzyna': 'Benzyna',
    'benzyna+lpg': 'Autogaz',
    'lpg': 'Autogaz',
    'autogaz': 'Autogaz',
    'gaz': 'Autogaz',
    'hybryda': 'Hybryda',
    'elektryczny': 'Elektryczny',
    'alternatywne': 'Alternatywne',
}


def get_data_from_url(url):
    try:
        r = requests.get(url, headers=HEADERS, timeout=40)
        if r.status_code in (404, 410):
            return None
        r.encoding = "utf-8"
        bs = BeautifulSoup(r.text, features="html.parser")

        # Check active listing container on brzozowskie.pl or legacy brzozowiak
        offer_data = bs.select_one(".hp-listing--view-page, .hp-listing")
        if not offer_data:
            offer_data = bs.find("div", class_="stdBxC")

        if not offer_data:
            return None

        # Check for phrases indicating the offer is deleted or expired
        text_lower = r.text.lower()
        has_gone_phrase = (
            "strona nie została znaleziona" in text_lower or
            "nie znaleziono ogłoszenia" in text_lower or
            "ogłoszenie nie istnieje" in text_lower or
            "ogłoszenie zostało usunięte" in text_lower or
            "ogłoszenie wygasło" in text_lower or
            "zostało usunięte" in text_lower or
            "wygasło" in text_lower
        )
        if has_gone_phrase:
            return None

        details = {
            "url": url,
            "id": None,
            "title": None,
            "description": None,
            "date": None,
            "location": None,
            "brand": None,
            "model": None,
            "capacity": None,
            "year": None,
            "transmission": None,
            "fuel": None,
            "body": None,
            "color": None,
            "price": None,
            "km": None,
            "mileage": None,
            "equipment": None,
            "img": None,
            "images": [],
            "number_of_doors": None,
            "imported_status": None,
            "usage": None,
            "registration_country": None,
            "mot_valid_until": None,
            "insurance_paid_until": None,
        }

        # ID extraction
        m_id = re.search(r'/oferta/(\d+)', url)
        if m_id:
            details["id"] = m_id.group(1)
        elif "brzozowiak.pl" in url:
            details["id"] = url[-12:-5]
        else:
            details["id"] = url.rstrip('/').split('/')[-1]

        # Extract JSON-LD product metadata if available
        json_ld = None
        for script in bs.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string)
                if isinstance(data, dict):
                    if '@graph' in data:
                        for item in data['@graph']:
                            if item.get('@type') == 'Product':
                                json_ld = item
                                break
                    elif data.get('@type') == 'Product':
                        json_ld = data
            except Exception:
                pass

        # Title
        title_el = offer_data.select_one("h1.hp-listing__title, h1, h2.presTitle")
        details["title"] = title_el.text.strip() if title_el else (json_ld.get("name") if json_ld else None)

        # Description
        desc_el = offer_data.select_one(".hp-listing__description, .hp-listing__content, p.presDesc")
        details["description"] = desc_el.text.strip() if desc_el else (json_ld.get("description") if json_ld else None)

        # Date (stored as YYYY.MM.DD)
        time_el = offer_data.select_one("time.hp-listing__created-date, time, date.presPubDate")
        if time_el:
            raw_dt = time_el.get("datetime")
            if raw_dt:
                dt_part = raw_dt.split("T")[0].split()[0]
                details["date"] = dt_part.replace("-", ".")
            else:
                m_date = re.search(r'(\d{4})[.-](\d{2})[.-](\d{2})', time_el.text)
                if m_date:
                    details["date"] = f"{m_date.group(1)}.{m_date.group(2)}.{m_date.group(3)}"
                else:
                    m_date_pl = re.search(r'(\d{2})\.(\d{2})\.(\d{4})', time_el.text)
                    if m_date_pl:
                        details["date"] = f"{m_date_pl.group(3)}.{m_date_pl.group(2)}.{m_date_pl.group(1)}"
                    else:
                        details["date"] = time_el.text.strip()

        # Location
        loc_el = offer_data.select_one(".brz-map__place, .brz-card-meta__place, .hp-listing__location, address.presLoc")
        details["location"] = loc_el.text.strip() if loc_el else None

        # Price (digits only)
        price_span = offer_data.select_one(".brz-price, p.presPrice")
        if price_span:
            digits = re.sub(r'[^\d]', '', price_span.text)
            details["price"] = digits if digits else None
        elif json_ld and "offers" in json_ld and "price" in json_ld["offers"]:
            details["price"] = str(json_ld["offers"]["price"])

        # HivePress attributes
        attr_map = {}
        for attr in offer_data.select(".hp-listing__attribute"):
            classes = attr.get("class", [])
            mod = [c for c in classes if c.startswith("hp-listing__attribute--")]
            key = mod[0].replace("hp-listing__attribute--", "") if mod else None
            if key:
                text = attr.text
                val = text.split(":", 1)[1].strip() if ":" in text else text.strip()
                attr_map[key] = val

        # Map attributes
        details["brand"] = attr_map.get("marka-auta") or (json_ld.get("brand", {}).get("name") if json_ld and isinstance(json_ld.get("brand"), dict) else None)
        details["model"] = attr_map.get("model")
        details["year"] = attr_map.get("rok-produkcji")

        trans_val = attr_map.get("skrzynia")
        details["transmission"] = trans_val.lower() if trans_val else None

        raw_fuel = attr_map.get("paliwo")
        if raw_fuel:
            details["fuel"] = FUEL_MAP.get(raw_fuel.lower(), raw_fuel)

        raw_mileage = attr_map.get("przebieg")
        if raw_mileage:
            digits = re.sub(r'[^\d]', '', raw_mileage)
            details["mileage"] = f"{digits}km" if digits else None

        raw_cap = attr_map.get("pojemnosc")
        if raw_cap:
            digits = re.sub(r'[^\d]', '', raw_cap)
            details["capacity"] = f"{digits}cm3" if digits else None

        details["body"] = attr_map.get("nadwozie") or attr_map.get("typ-nadwozia")
        details["color"] = attr_map.get("kolor")
        details["number_of_doors"] = attr_map.get("liczba-drzwi")
        details["imported_status"] = attr_map.get("stan") or attr_map.get("status-pojazdu")
        details["km"] = attr_map.get("moc-silnika") or attr_map.get("moc")
        details["equipment"] = attr_map.get("wyposazenie")
        details["usage"] = attr_map.get("uzytkowanie")
        details["registration_country"] = attr_map.get("kraj-rejestracji")
        details["mot_valid_until"] = attr_map.get("przeglad")
        details["insurance_paid_until"] = attr_map.get("ubezpieczenie")

        # Legacy fallback if parsing an old brzozowiak page
        def get_th_value(label_text):
            th_element = offer_data.find("th", string=lambda t: t and label_text in t)
            if not th_element:
                th_element = offer_data.find(lambda tag: tag.name == "th" and label_text in tag.text)
            return th_element.next_sibling.text.strip() if th_element and th_element.next_sibling else None

        if not details["brand"] and offer_data.find("td", itemprop="brand"):
            details["brand"] = offer_data.find("td", itemprop="brand").text.strip()
        if not details["model"] and offer_data.find("td", itemprop="model"):
            details["model"] = offer_data.find("td", itemprop="model").text.strip()
        if not details["year"] and offer_data.find("td", itemprop="productionDate"):
            details["year"] = offer_data.find("td", itemprop="productionDate").text.strip()
        if not details["transmission"] and offer_data.find("td", itemprop="vehicleTransmission"):
            details["transmission"] = offer_data.find("td", itemprop="vehicleTransmission").text.strip()
        if not details["fuel"] and offer_data.find("td", itemprop="fuelType"):
            details["fuel"] = offer_data.find("td", itemprop="fuelType").text.strip()
        if not details["body"] and offer_data.find("td", itemprop="bodyType"):
            details["body"] = offer_data.find("td", itemprop="bodyType").text.strip()
        if not details["color"] and offer_data.find("td", itemprop="color"):
            details["color"] = offer_data.find("td", itemprop="color").text.strip()
        if not details["capacity"]:
            details["capacity"] = get_th_value("Pojemność silnika")
        if not details["km"]:
            details["km"] = get_th_value("Moc silnika")
        if not details["number_of_doors"] and offer_data.find("td", itemprop="numberOfDoors"):
            details["number_of_doors"] = offer_data.find("td", itemprop="numberOfDoors").text.strip()
        if not details["imported_status"]:
            details["imported_status"] = get_th_value("Status pojazdu sprowadzonego")
        if not details["usage"]:
            details["usage"] = get_th_value("Użytkowanie")
        if not details["registration_country"]:
            details["registration_country"] = get_th_value("Kraj aktualnej rejestracji")
        if not details["mot_valid_until"]:
            details["mot_valid_until"] = get_th_value("Przegląd techniczny ważny do")
        if not details["insurance_paid_until"]:
            details["insurance_paid_until"] = get_th_value("Ubezpieczenie OC opłacone do")

        # Images
        images = []
        img_container = offer_data.select_one(".hp-listing__images, .hp-listing__image, #LGA")
        if img_container:
            for img in img_container.select("img"):
                src = img.get("data-zoom") or img.get("src")
                if src and src not in images:
                    images.append(src)
            for a in img_container.select("a.ath, a[href*='wp-content/uploads']"):
                src = a.get("href")
                if src and src not in images:
                    images.append(src)

        if not images and json_ld and "image" in json_ld:
            img_val = json_ld["image"]
            if isinstance(img_val, list):
                images.extend(img_val)
            elif isinstance(img_val, str):
                images.append(img_val)

        details["images"] = images
        details["img"] = images[0] if images else None

        return details
    except Exception as e:
        log(f"Failed getting data from {url}: {e}")
        return None


def run_scraper():
    base_url = "https://brzozowskie.pl"
    base_cat_url = "https://brzozowskie.pl/ogloszenia/motoryzacja/samochody-osobowe/"
    pages_count = 200

    # Get existing URLs from DB
    db_urls = set(Offer.objects.values_list('url', flat=True))

    new_urls = []
    scraped_urls = set()
    consecutive_existing = 0
    stop_scraping = False
    archived_count = 0

    for page in range(pages_count):
        if stop_scraping:
            break

        try:
            page_num = page + 1
            if page_num == 1:
                page_url = base_cat_url
            else:
                page_url = f"{base_cat_url}page/{page_num}/"

            log(f"Getting {page_num} page ({page_url})...")
            r = requests.get(page_url, headers=HEADERS, timeout=25)

            if r.status_code == 404:
                log(f"Page {page_num} returned 404 (end of pagination). Breaking...")
                break

            if r.status_code != 200:
                log(f"Page {page_num} returned status {r.status_code}. Breaking...")
                break

            bs = BeautifulSoup(r.text, features="html.parser")
            listing_cards = bs.select(".hp-listing--view-block, article.brz-card, .hp-listing")

            if not listing_cards:
                listing_cards = bs.select("div.listRow")

            if not listing_cards:
                log("No more auctions found. Breaking...")
                break

            page_offer_urls = []
            for card in listing_cards:
                a_tag = card.select_one("a[href*='/oferta/']") or card.find("a")
                if a_tag and 'href' in a_tag.attrs:
                    offer_url = a_tag['href']
                    full_url = base_url + offer_url if not offer_url.startswith("http") else offer_url
                    if full_url not in page_offer_urls:
                        page_offer_urls.append(full_url)

            if not page_offer_urls:
                log("No offer links found on this page. Breaking...")
                break

            for full_url in page_offer_urls:
                scraped_urls.add(full_url)

                if full_url in db_urls:
                    consecutive_existing += 1
                    if page >= 9 and consecutive_existing >= 100:
                        log("Found 100 consecutive existing offers and scanned at least 10 pages. Stopping pagination.")
                        stop_scraping = True
                        break
                else:
                    consecutive_existing = 0
                    if full_url not in new_urls:
                        new_urls.append(full_url)

            # Realistic delay between page loads
            time.sleep(random.uniform(1.0, 3.0))

        except Exception as e:
            log(f"Failed getting page {page+1}: {e}")
            time.sleep(1)

    if new_urls:
        log(f"Adding {len(new_urls)} new offers to database.")
        for index, u in enumerate(new_urls):
            log(f"{round((index+1)/(len(new_urls))*100)}% - Offer: {index+1}/{len(new_urls)}")
            details = get_data_from_url(u)
            if details:
                for attempt in range(5):
                    try:
                        from scraper.telegram_utils import send_telegram_message, format_offer_message, offer_matches_search
                        from scraper.models import SavedSearch

                        offer, created = Offer.objects.update_or_create(
                            offer_id=details["id"],
                            defaults={
                                'url': details["url"],
                                'title': details.get("title"),
                                'description': details.get("description"),
                                'date': details.get("date"),
                                'location': details.get("location"),
                                'brand': details.get("brand"),
                                'model': details.get("model"),
                                'capacity': details.get("capacity"),
                                'year': details.get("year"),
                                'transmission': details.get("transmission"),
                                'fuel': details.get("fuel"),
                                'body': details.get("body"),
                                'color': details.get("color"),
                                'price': details.get("price"),
                                'km': details.get("km"),
                                'mileage': details.get("mileage"),
                                'equipment': details.get("equipment"),
                                'img': details.get("img"),
                                'number_of_doors': details.get("number_of_doors"),
                                'imported_status': details.get("imported_status"),
                                'usage': details.get("usage"),
                                'registration_country': details.get("registration_country"),
                                'mot_valid_until': details.get("mot_valid_until"),
                                'insurance_paid_until': details.get("insurance_paid_until"),
                                'images': details.get("images", []),
                                'is_archived': False,
                            }
                        )

                        # Check for Telegram notifications if it's a brand new offer
                        if created:
                            active_searches = SavedSearch.objects.filter(telegram_notifications=True)
                            for ss in active_searches:
                                if offer_matches_search(offer, ss.query_string):
                                    msg = format_offer_message(offer, ss.name)
                                    if send_telegram_message(msg):
                                        log(f"Sent Telegram notification for: {offer.title} (Search: {ss.name})")
                                    else:
                                        log(f"Failed to send Telegram notification for: {offer.title}")

                        break
                    except Exception as e:
                        if "locked" in str(e).lower() and attempt < 4:
                            log(f"Database locked, retrying {attempt+1}/5...")
                            time.sleep(3)
                        else:
                            log(f"Failed to save offer {details.get('id', u)}: {e}")
                            break
            
            # Realistic delay between individual offer loads
            time.sleep(random.uniform(0.5, 1.5))

        log("Finished successfully!")
    else:
        log("Database up to date.")

    # Update active offers and detect sold ones
    log("Checking if any active database offers have been sold...")
    scraped_active_dates = []
    
    # Existing active offers that we saw in this scrape session
    if scraped_urls:
        existing_seen_dates = Offer.objects.filter(url__in=scraped_urls, is_archived=False).values_list('date', flat=True)
        scraped_active_dates.extend([d for d in existing_seen_dates if d])
        
    # Get the dates of new offers we successfully scraped in this session
    if new_urls:
        new_seen_dates = Offer.objects.filter(url__in=new_urls, is_archived=False).values_list('date', flat=True)
        scraped_active_dates.extend([d for d in new_seen_dates if d])

    if scraped_active_dates:
        # Filter out ancient pinned/bumped offers (older than 30 days) from triggering a massive DB-wide check
        from datetime import timedelta
        from django.utils import timezone
        thirty_days_ago = (timezone.localtime(timezone.now()) - timedelta(days=30)).strftime('%Y.%m.%d')
        
        recent_scraped_dates = [d for d in scraped_active_dates if d >= thirty_days_ago]
        if recent_scraped_dates:
            oldest_date = min(recent_scraped_dates)
        else:
            oldest_date = thirty_days_ago

        log(f"Oldest active date to check: {oldest_date}. Checking active offers with date >= {oldest_date}...")
        
        # Candidates for archiving: active offers newer or equal to oldest_date that were not seen
        candidates = Offer.objects.filter(is_archived=False, date__gte=oldest_date)
        if scraped_urls:
            candidates = candidates.exclude(url__in=scraped_urls)
            
        candidates_count = candidates.count()
        if candidates_count > 0:
            log(f"Found {candidates_count} candidates that were not seen on the scraped pages. Verifying their status...")
            archived_count = 0
            for candidate in candidates:
                try:
                    res = requests.get(candidate.url, headers=HEADERS, timeout=10)
                    is_gone = False
                    if res.status_code in (404, 410):
                        is_gone = True
                    else:
                        res.encoding = "utf-8"
                        bs = BeautifulSoup(res.text, features="html.parser")
                        offer_data = bs.select_one(".hp-listing--view-page, .hp-listing, div.stdBxC")
                        text_lower = res.text.lower()
                        has_gone = (
                            "strona nie została znaleziona" in text_lower or
                            "nie znaleziono ogłoszenia" in text_lower or
                            "ogłoszenie nie istnieje" in text_lower or
                            "ogłoszenie zostało usunięte" in text_lower or
                            "ogłoszenie wygasło" in text_lower or
                            "zostało usunięte" in text_lower or
                            "wygasło" in text_lower
                        )
                        if not offer_data or has_gone:
                            is_gone = True
                    
                    if is_gone:
                        candidate.is_archived = True
                        candidate.archived_by = 'scan'
                        if candidate.title and not candidate.title.startswith("[SPRZEDANE]"):
                            candidate.title = f"[SPRZEDANE] {candidate.title}"
                        candidate.save()
                        archived_count += 1
                        log(f"Archived sold/inactive offer: {candidate.offer_id} ({candidate.title})")
                    
                    time.sleep(random.uniform(0.5, 1.5))
                except Exception as e:
                    log(f"Error verifying candidate {candidate.offer_id}: {e}")
            log(f"Verification complete. Archived {archived_count} offers.")
        else:
            log("No unseen active candidates to verify.")
    else:
        log("No scraped dates collected; skipping active status check.")

    return archived_count


def run_maintenance(limit=None):
    log("Running maintenance: checking for inactive offers...")
    # Get all non-archived offers
    active_offers = Offer.objects.exclude(is_archived=True).order_by('id')
    total = active_offers.count()
    if limit:
        active_offers = active_offers[:limit]
        check_count = min(total, limit)
    else:
        check_count = total
    
    archived_count = 0
    log(f"Starting check for {check_count} active offers (total in DB: {total})...")
    
    session = requests.Session()
    session.headers.update(HEADERS)
    
    for i, offer in enumerate(active_offers):
        if (i + 1) % 50 == 0 or (i + 1) == check_count:
            log(f"Progress: {i + 1}/{check_count} offers checked... (Archived so far: {archived_count})")
            
        try:
            # Check if URL is still valid
            response = session.get(offer.url, timeout=15)
            
            is_gone = False
            # HTTP 404 or 410 Gone
            if response.status_code in (404, 410):
                is_gone = True
            elif response.status_code == 200:
                response.encoding = "utf-8"
                bs = BeautifulSoup(response.text, features="html.parser")
                offer_data = bs.select_one(".hp-listing--view-page, .hp-listing, div.stdBxC")
                
                # Active offers on brzozowskie have .hp-listing--view-page (or legacy stdBxC).
                # When deleted or expired, offer_data is absent or a gone message is displayed.
                text_lower = response.text.lower()
                has_gone_phrase = (
                    "strona nie została znaleziona" in text_lower or
                    "nie znaleziono ogłoszenia" in text_lower or
                    "ogłoszenie nie istnieje" in text_lower or
                    "ogłoszenie zostało usunięte" in text_lower or
                    "ogłoszenie wygasło" in text_lower or
                    "zostało usunięte" in text_lower or
                    "wygasło" in text_lower
                )
                
                if not offer_data or has_gone_phrase:
                    is_gone = True
            elif response.status_code >= 500:
                log(f"Server error ({response.status_code}) checking offer {offer.offer_id}, skipping...")
                continue
                
            if is_gone:
                offer.is_archived = True
                offer.archived_by = 'maintenance'
                if offer.title and not offer.title.startswith("[SPRZEDANE]"):
                    offer.title = f"[SPRZEDANE] {offer.title}"
                offer.save(update_fields=['is_archived', 'archived_by', 'title', 'updated_at'])
                archived_count += 1
                log(f"Archived inactive/sold offer: {offer.offer_id} ({offer.title})")
        except Exception as e:
            log(f"Error checking {offer.offer_id}: {e}")
            
        # Randomized user-like delays
        time.sleep(random.uniform(0.5, 1.5))
        if i > 0 and i % 15 == 0:
            time.sleep(random.uniform(2.0, 4.0)) # Occasional longer pause
        
    log(f"Maintenance complete. Checked: {check_count}. Total archived: {archived_count}")
    return archived_count

class Command(BaseCommand):
    help = 'Runs the scraper every 1h +- rand 1-30min'

    def add_arguments(self, parser):
        parser.add_argument(
            '--maintenance',
            action='store_true',
            help='Run the maintenance check immediately to archive inactive offers',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limit the number of offers to check during maintenance',
        )

    def handle(self, *args, **options):
        if options.get('maintenance'):
            limit = options.get('limit')
            log(f"Manual maintenance run requested (limit={limit})...")
            status, _ = ScraperStatus.objects.get_or_create(id=1)
            status.is_running = True
            status.save()
            try:
                archived = run_maintenance(limit=limit)
                status.last_maintenance_archived_count = archived
                status.last_maintenance_run = timezone.now()
            except Exception as e:
                log(f"Maintenance error: {e}")
            finally:
                status.is_running = False
                status.save()
            return

        log("Scraper started...")
        while True:
            now = timezone.localtime()
            status, _ = ScraperStatus.objects.get_or_create(id=1)
            
            # WEEKLY MAINTENANCE CHECK (between 2 AM and 4 AM)
            # Run once per week in this window
            is_night_window = 2 <= now.hour <= 4
            
            needs_maintenance = True
            if status.last_maintenance_run:
                # Check if it's been at least 7 days since the last run
                days_since_last = (now - timezone.localtime(status.last_maintenance_run)).days
                if days_since_last < 7:
                    needs_maintenance = False
            
            if is_night_window and needs_maintenance:
                log(f"Maintenance window reached ({now.hour}:00). Starting maintenance...")
                status.is_running = True
                status.save()
                success = False
                try:
                    archived = run_maintenance()
                    status.last_maintenance_archived_count = archived
                    success = True
                except Exception as e:
                    log(f"Maintenance error: {e}")
                if success:
                    status.last_maintenance_run = timezone.now()
                status.is_running = False
                status.save()
                log("Maintenance session finished.")

            # SCRAPING WINDOW CHECK (6 AM - 10 PM)
            is_scraping_window = 6 <= now.hour < 22
            
            if is_scraping_window or status.force_scrape:
                log("Starting a new scraping cycle...")
                status.is_running = True
                status.force_scrape = False  # Reset flag when starting
                status.last_run = timezone.now()
                status.save()
                
                try:
                    archived = run_scraper()
                    status.refresh_from_db()
                    status.last_scan_archived_count = archived
                    status.save()
                except Exception as e:
                    log(f"Scraper error: {e}")
            else:
                log(f"Outside scraping window (6-22). Current local hour: {now.hour}. Skipping scraper run.")
                # We don't reset force_scrape here, so it can still be used to bypass the window if needed
            
            # Calculate wait time
            base_wait = 3600
            rand_direction = random.choice([-1, 1])
            rand_wait = random.randint(60, 1800)
            wait_time = base_wait + (rand_direction * rand_wait)
            
            status.is_running = False
            
            # Calculate next run time
            next_run_candidate = timezone.now() + timedelta(seconds=wait_time)
            next_run_local = timezone.localtime(next_run_candidate)
            
            # Determine if weekly maintenance is due
            now = timezone.localtime()
            needs_maintenance = True
            if status.last_maintenance_run:
                days_since_last = (now - timezone.localtime(status.last_maintenance_run)).days
                if days_since_last < 7:
                    needs_maintenance = False
            
            # If next run would fall outside 6-22, check if we need to wake up for maintenance
            if next_run_local.hour >= 22 or next_run_local.hour < 6:
                if needs_maintenance:
                    # Schedule next run for 2 AM (the maintenance window)
                    if next_run_local.hour >= 22:
                        target_local = (next_run_local + timedelta(days=1)).replace(hour=2, minute=0, second=0, microsecond=0)
                    else:
                        target_local = next_run_local.replace(hour=2, minute=0, second=0, microsecond=0)
                else:
                    if next_run_local.hour >= 22:
                        target_local = (next_run_local + timedelta(days=1)).replace(hour=6, minute=0, second=0, microsecond=0)
                    else:
                        target_local = next_run_local.replace(hour=6, minute=0, second=0, microsecond=0)
                status.next_run = target_local
            else:
                status.next_run = next_run_candidate
                
            status.save()
            
            # Calculate how long to actually sleep in this loop iteration
            # We cap it at 1 hour to ensure we don't miss the maintenance window or force_scrape checks
            actual_wait_seconds = (status.next_run - timezone.now()).total_seconds()
            sleep_time = max(min(actual_wait_seconds, 3600), 10) # At least 10 seconds, at most 1 hour
            
            log(f"Sleeping for {round(sleep_time / 60, 2)} minutes...")
            end_sleep = timezone.now() + timedelta(seconds=sleep_time)
            while timezone.now() < end_sleep:
                # Check for forced scrape
                status.refresh_from_db()
                if status.force_scrape:
                    log("Force scrape detected! Breaking sleep...")
                    break
                time.sleep(1)
