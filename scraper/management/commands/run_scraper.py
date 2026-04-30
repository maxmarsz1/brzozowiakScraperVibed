import time
import random
import requests
from bs4 import BeautifulSoup
from django.core.management.base import BaseCommand
from scraper.models import Offer

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
}

def get_auctions(url, pages_count):
    pages = []
    failed = []

    for page in range(pages_count):
        try:
            print(f"Getting {page+1} page...")
            r = requests.get(url + str(page+1), headers=HEADERS)
            bs = BeautifulSoup(r.text, features="html.parser")
            auctions = bs.find("div", class_="list")

            if len(pages) and pages[-1] == auctions:
                print("Went through all pages. Breaking...")
                break
            
            if auctions:
                pages.append(auctions)

        except Exception as e:
            print(e)
            failed.append(page)
            time.sleep(1)

    if failed:
        print("Retrying on failed pages.")
        for page in failed:
            try:
                print(f"Retrying on {page+1} page...")
                r = requests.get(url + str(page+1), headers=HEADERS)
                bs = BeautifulSoup(r.text, features="html.parser")
                auctions = bs.find("div", class_="list")
                if auctions:
                    pages.append(auctions)
            except Exception as e:
                print(f"Failed again on page {page+1}: {e}")

    return pages

def get_auction_urls(auctions):
    urls = []
    for page in auctions:
        if page is None:
            continue
        offers = page.find_all("div", class_="listRow")
        for offer in offers:
            a_tag = offer.find("a")
            if a_tag and 'href' in a_tag.attrs:
                urls.append(a_tag['href'])
    return urls

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
        details["img"] = img_a['href'] if img_a and 'href' in img_a.attrs else None

        return details
    except Exception as e:
        print(f"Failed getting data from {url}: {e}")
        return None


def run_scraper():
    base_url = "https://brzozowiak.pl"
    url = "https://brzozowiak.pl/samochody-osobowe/?str="
    pages_count = 200

    try:
        # Get existing URLs from DB
        db_urls = set(Offer.objects.values_list('url', flat=True))

        auctions = get_auctions(url, pages_count)
        urls = [base_url + u if not u.startswith("http") else u for u in get_auction_urls(auctions)]

        new_urls = [u for u in urls if u not in db_urls]

        if new_urls:
            print(f"Adding {len(new_urls)} new offers to database.")
            for index, u in enumerate(new_urls):
                print(f"{round((index+1)/(len(new_urls))*100)}% - Offer: {index+1}/{len(new_urls)}")
                details = get_data_from_url(u)
                if details:
                    # Update or create offer
                    Offer.objects.update_or_create(
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
                        }
                    )
            print("Finished successfully!")
        else:
            print("Database up to date.")
    except Exception as e:
        print(f"Error during scraping: {e}")


class Command(BaseCommand):
    help = 'Runs the scraper every 1h +- rand 1-30min'

    def handle(self, *args, **options):
        print("Scraper started...")
        while True:
            print("Starting a new scraping cycle...")
            run_scraper()
            
            # Wait 1 hour (3600 seconds) +/- 1-30 minutes (60 - 1800 seconds)
            base_wait = 3600
            rand_direction = random.choice([-1, 1])
            rand_wait = random.randint(60, 1800)
            wait_time = base_wait + (rand_direction * rand_wait)
            
            next_run = wait_time / 60
            print(f"Sleeping for {round(next_run, 2)} minutes until next run...")
            time.sleep(wait_time)
