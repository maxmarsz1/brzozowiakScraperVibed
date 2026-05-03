import requests
import os
from django.conf import settings
from urllib.parse import parse_qs

def send_telegram_message(message, return_error=False):
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    
    if not token or not chat_id:
        err = "Brak konfiguracji Telegram (TOKEN/CHAT_ID) w .env."
        print(err)
        return (False, err) if return_error else False
        
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "HTML",
        "disable_web_page_preview": False
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        if response.status_code == 200:
            return (True, None) if return_error else True
        
        error_detail = f"Błąd Telegram {response.status_code}: {response.text}"
        print(error_detail)
        return (False, error_detail) if return_error else False
    except Exception as e:
        error_detail = f"Błąd połączenia z Telegram: {str(e)}"
        print(error_detail)
        return (False, error_detail) if return_error else False

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
            
        # Fuel check - supports multiple values (e.g., fuel=Benzyna&fuel=Diesel or fuel=Benzyna,Diesel)
        fuel_params = params.get('fuel')
        if fuel_params:
            # Flatten any comma-separated strings into a single set of allowed fuels
            allowed_fuels = set()
            for f in fuel_params:
                for part in f.split(','):
                    allowed_fuels.add(part.strip())
            
            if (offer.fuel or "") not in allowed_fuels:
                return False
            
        # Price check
        price_min = get_p('price_min')
        price_max = get_p('price_max')
        # Filter out "trash" prices if the flag was set (handled by numeric range usually)
        if offer.price:
            try:
                price_val = int(offer.price)
                if price_min and price_val < int(price_min): return False
                if price_max and price_val > int(price_max): return False
            except ValueError:
                # If filter is set but price is not numeric (e.g. "Ask"), 
                # we exclude it if a numeric range is required
                if price_min or price_max: return False
                
        # Year check
        year_min = get_p('year_min')
        year_max = get_p('year_max')
        if offer.year:
            try:
                year_val = int(offer.year)
                if year_min and year_val < int(year_min): return False
                if year_max and year_val > int(year_max): return False
            except ValueError:
                if year_min or year_max: return False
                
        # Keywords check
        search_filter = get_p('search')
        if search_filter:
            search_filter = search_filter.lower()
            text_to_search = f"{(offer.title or '').lower()} {(offer.description or '').lower()}"
            # Support multiple space-separated keywords
            keywords = search_filter.split()
            if not all(k in text_to_search for k in keywords):
                return False

        return True
    except Exception as e:
        print(f"Error matching offer: {e}")
        return False
