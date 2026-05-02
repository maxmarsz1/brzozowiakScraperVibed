import time
import random
import requests
from bs4 import BeautifulSoup
from django.core.management.base import BaseCommand
from scraper.models import Offer, ScraperStatus, ScraperLog
from django.utils import timezone
from datetime import timedelta
import os
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
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
}


def get_data_from_url(url):
    try:
        r = requests.get(url, headers=HEADERS, timeout=40)
        r.encoding = "utf-8"
        bs = BeautifulSoup(r.text, features="html.parser")
        offer_data = bs.find("div", class_="stdBxC")

        if not offer_data:
            return None

        details = {}

        def get_text_or_null(element):
            return element.text.strip() if element else None

        def get_th_value(label_text):
            th_element = offer_data.find("th", string=lambda t: t and label_text in t)
            if not th_element:
                th_element = offer_data.find(lambda tag: tag.name == "th" and label_text in tag.text)
            return get_text_or_null(th_element.next_sibling) if th_element else None

        details["title"] = get_text_or_null(offer_data.find("h2", class_="presTitle"))
        details["description"] = get_text_or_null(offer_data.find("p", class_="presDesc"))
        details["date"] = get_text_or_null(offer_data.find("date", class_="presPubDate"))
        details["location"] = get_text_or_null(offer_data.find("address", class_="presLoc"))

        details["brand"] = get_text_or_null(offer_data.find("td", itemprop="brand"))
        details["model"] = get_text_or_null(offer_data.find("td", itemprop="model"))
        details["year"] = get_text_or_null(offer_data.find("td", itemprop="productionDate"))
        details["transmission"] = get_text_or_null(offer_data.find("td", itemprop="vehicleTransmission"))
        details["fuel"] = get_text_or_null(offer_data.find("td", itemprop="fuelType"))
        details["body"] = get_text_or_null(offer_data.find("td", itemprop="bodyType"))
        details["color"] = get_text_or_null(offer_data.find("td", itemprop="color"))

        # New itemprop
        details["number_of_doors"] = get_text_or_null(offer_data.find("td", itemprop="numberOfDoors"))

        # Table headers (TH)
        details["capacity"] = get_th_value("Pojemność silnika")
        details["km"] = get_th_value("Moc silnika")

        # New TH fields
        details["imported_status"] = get_th_value("Status pojazdu sprowadzonego")
        details["usage"] = get_th_value("Użytkowanie")
        details["registration_country"] = get_th_value("Kraj aktualnej rejestracji")
        details["mot_valid_until"] = get_th_value("Przegląd techniczny ważny do")
        details["insurance_paid_until"] = get_th_value("Ubezpieczenie OC opłacone do")

        price_p = offer_data.find("p", class_="presPrice")
        if price_p:
            details["price"] = price_p.text.replace(" PLN", "").replace(" ", "").strip()
        else:
            details["price"] = None

        mileage_span = offer_data.find("span", string=lambda t: t and "Przebieg:" in t)
        if not mileage_span:
            mileage_span = offer_data.find(lambda tag: tag.name == "span" and "Przebieg:" in tag.text)
        if mileage_span and mileage_span.parent and mileage_span.parent.b:
            details["mileage"] = mileage_span.parent.b.text.replace(" KM", "").replace(" ", "").strip()
        else:
            details["mileage"] = None

        details["equipment"] = get_text_or_null(offer_data.find("p", itemprop="description"))

        details["id"] = url[-12:-5]
        details["url"] = url

        img_a = offer_data.find("a", class_="ath")

        # Extract all images from the LGA div container
        lga_div = offer_data.find("div", id="LGA", class_="athCnt")
        if lga_div:
            img_links = [a['href'] for a in lga_div.find_all("a", class_="ath") if 'href' in a.attrs]
            details["images"] = img_links
        else:
            details["images"] = [img_a['href']] if img_a and 'href' in img_a.attrs else []

        details["img"] = details["images"][0] if details["images"] else None

        return details
    except Exception as e:
        log(f"Failed getting data from {url}: {e}")
        return None


def run_scraper():
    base_url = "https://brzozowiak.pl"
    url = "https://brzozowiak.pl/samochody-osobowe/?str="
    pages_count = 200

    # Get existing URLs from DB
    db_urls = set(Offer.objects.values_list('url', flat=True))

    new_urls = []
    consecutive_existing = 0
    stop_scraping = False

    for page in range(pages_count):
        if stop_scraping:
            break

        try:
            log(f"Getting {page+1} page...")
            r = requests.get(url + str(page+1), headers=HEADERS)
            bs = BeautifulSoup(r.text, features="html.parser")
            auctions_list = bs.find("div", class_="list")

            if not auctions_list:
                log("No more auctions found. Breaking...")
                break

            offers = auctions_list.find_all("div", class_="listRow")
            if not offers:
                break

            for offer in offers:
                a_tag = offer.find("a")
                if a_tag and 'href' in a_tag.attrs:
                    offer_url = a_tag['href']
                    full_url = base_url + offer_url if not offer_url.startswith("http") else offer_url

                    if full_url in db_urls:
                        consecutive_existing += 1
                        if consecutive_existing >= 100 and len(db_urls) > 4000:
                            log("Found 100 consecutive existing offers. Stopping pagination.")
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


def run_maintenance():
    log("Running maintenance: checking for inactive offers...")
    # Get all non-archived offers
    active_offers = Offer.objects.filter(is_archived=False)
    total = active_offers.count()
    archived_count = 0
    
    log(f"Starting check for {total} active offers...")
    
    for i, offer in enumerate(active_offers):
        if (i + 1) % 50 == 0:
            log(f"Progress: {i + 1}/{total} offers checked...")
            
        try:
            # Check if URL is still valid
            response = requests.get(offer.url, headers=HEADERS, timeout=10)
            
            # Brzozowiak often returns 200 but with "Nie znaleziono" text for deleted offers
            # Or it might return 404
            is_gone = False
            if response.status_code == 404:
                is_gone = True
            elif "ogłoszenie nie istnieje" in response.text.lower() or "nie znaleziono ogłoszenia" in response.text.lower():
                is_gone = True
                
            if is_gone:
                offer.is_archived = True
                offer.save()
                archived_count += 1
                log(f"Archived inactive offer: {offer.offer_id}")
        except Exception as e:
            log(f"Error checking {offer.offer_id}: {e}")
            
        # polite delay
        time.sleep(0.3)
        
    log(f"Maintenance complete. Total archived: {archived_count}")

class Command(BaseCommand):
    help = 'Runs the scraper every 1h +- rand 1-30min'

    def handle(self, *args, **options):
        log("Scraper started...")
        while True:
            now = timezone.now()
            status, _ = ScraperStatus.objects.get_or_create(id=1)
            
            # NIGHT MAINTENANCE CHECK (between 2 AM and 4 AM)
            # Run once per day in this window
            is_night_window = 2 <= now.hour <= 4
            already_run_today = status.last_maintenance_run and status.last_maintenance_run.date() == now.date()
            
            if is_night_window and not already_run_today:
                log(f"Maintenance window reached ({now.hour}:00). Starting maintenance...")
                status.is_running = True
                status.save()
                try:
                    run_maintenance()
                except Exception as e:
                    log(f"Maintenance error: {e}")
                status.last_maintenance_run = timezone.now()
                status.is_running = False
                status.save()
                log("Maintenance session finished.")

            log("Starting a new scraping cycle...")
            status.is_running = True
            status.force_scrape = False  # Reset flag when starting
            status.last_run = timezone.now()
            status.save()
            
            run_scraper()
            
            # Calculate wait time
            base_wait = 3600
            rand_direction = random.choice([-1, 1])
            rand_wait = random.randint(60, 1800)
            wait_time = base_wait + (rand_direction * rand_wait)
            
            status.is_running = False
            status.next_run = timezone.now() + timedelta(seconds=wait_time)
            status.save()
            
            next_run_mins = wait_time / 60
            log(f"Sleeping for {round(next_run_mins, 2)} minutes until next run...")
            
            # Custom sleep loop to allow forcing a scrape
            end_sleep = timezone.now() + timedelta(seconds=wait_time)
            while timezone.now() < end_sleep:
                # Check for forced scrape
                status.refresh_from_db()
                if status.force_scrape:
                    log("Force scrape detected! Breaking sleep...")
                    break
                time.sleep(1)
