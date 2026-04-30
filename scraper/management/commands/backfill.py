from django.core.management.base import BaseCommand
from scraper.models import Offer
from scraper.management.commands.run_scraper import get_data_from_url

class Command(BaseCommand):
    help = 'Updates previously scraped offers that are missing the newly added fields'

    def handle(self, *args, **options):
        # Get all offers where we suspect the new data is completely missing.
        # (Since previously we didn't scrape these, they will all be None)
        offers = Offer.objects.filter(
            number_of_doors__isnull=True,
            imported_status__isnull=True,
            usage__isnull=True
        )
        total = offers.count()
        
        if total == 0:
            print("No incomplete offers found!")
            return
            
        print(f"Found {total} incomplete offers. Starting backfill...")
        
        updated_count = 0
        for i, offer in enumerate(offers):
            print(f"Updating offer {i+1}/{total} (ID: {offer.offer_id})...", end="\r")
            
            details = get_data_from_url(offer.url)
            if details:
                offer.number_of_doors = details.get("number_of_doors")
                offer.imported_status = details.get("imported_status")
                offer.usage = details.get("usage")
                offer.registration_country = details.get("registration_country")
                offer.mot_valid_until = details.get("mot_valid_until")
                offer.insurance_paid_until = details.get("insurance_paid_until")
                
                offer.save(update_fields=[
                    'number_of_doors', 
                    'imported_status', 
                    'usage', 
                    'registration_country', 
                    'mot_valid_until', 
                    'insurance_paid_until'
                ])
                updated_count += 1
                
        print(f"\nFinished updating {updated_count} offers with missing data!")
