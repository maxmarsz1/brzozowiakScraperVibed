import requests
import os
from django.conf import settings
from urllib.parse import parse_qs

def send_telegram_message(message):
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    
    if not token or not chat_id:
        print("Telegram credentials missing in environment.")
        return False
        
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "HTML",
        "disable_web_page_preview": False
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        return response.status_code == 200
    except Exception as e:
        print(f"Failed to send Telegram message: {e}")
        return False

def format_offer_message(offer, search_name):
    """Formats an offer into a clean Telegram message in Polish."""
    title = offer.title or "Nieznany tytuł"
    price = f"{offer.price} PLN" if offer.price else "Zapytaj o cenę"
    year = offer.year or "Brak danych"
    fuel = offer.fuel or "Brak danych"
    location = offer.location or "Nieznana lokalizacja"
    
    message = (
        f"🔔 <b>Nowe dopasowanie: {search_name}</b>\n\n"
        f"🚗 <b>{title}</b>\n"
        f"💰 Cena: <b>{price}</b>\n"
        f"📅 Rok: {year} | ⛽ {fuel}\n"
        f"📍 {location}\n\n"
        f"🔗 <a href='{offer.url}'>Zobacz ogłoszenie</a>"
    )
    return message

def offer_matches_search(offer, query_string):
    """
    Checks if an offer matches the filters in a query string.
    Note: This is a simplified version of the logic used in the frontend/API.
    """
    try:
        params = parse_qs(query_string)
        
        # Helper to get first value or None
        def get_p(key):
            val = params.get(key)
            return val[0] if val else None

        # Brand check
        brand_filter = get_p('brand')
        if brand_filter and brand_filter.lower() not in (offer.brand or "").lower():
            return False
            
        # Fuel check
        fuel_filter = get_p('fuel')
        if fuel_filter and fuel_filter != (offer.fuel or ""):
            return False
            
        # Price check
        price_min = get_p('price_min')
        price_max = get_p('price_max')
        if offer.price:
            try:
                price_val = int(offer.price)
                if price_min and price_val < int(price_min): return False
                if price_max and price_val > int(price_max): return False
            except ValueError:
                pass # If price isn't a number, skip numeric filters
                
        # Year check
        year_min = get_p('year_min')
        year_max = get_p('year_max')
        if offer.year:
            try:
                year_val = int(offer.year)
                if year_min and year_val < int(year_min): return False
                if year_max and year_val > int(year_max): return False
            except ValueError:
                pass
                
        # Keywords check
        search_filter = get_p('search')
        if search_filter:
            search_filter = search_filter.lower()
            text_to_search = f"{(offer.title or '').lower()} {(offer.description or '').lower()}"
            if search_filter not in text_to_search:
                return False

        return True
    except Exception as e:
        print(f"Error matching offer: {e}")
        return False
