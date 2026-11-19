from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters import rest_framework as filters
from rest_framework.filters import OrderingFilter, SearchFilter
from django.shortcuts import render
from django.db.models import FloatField, IntegerField, CharField
from django.db.models.functions import Cast, Replace
from django.db.models import Value
from datetime import timedelta
from django.utils import timezone
from .models import Offer, SavedSearch, ScraperStatus, ScraperLog
from .serializers import OfferSerializer, SavedSearchSerializer, ScraperStatusSerializer, ScraperLogSerializer

class CharInFilter(filters.BaseInFilter, filters.CharFilter):
    pass

class OfferFilter(filters.FilterSet):
    fuel = filters.CharFilter(method='filter_fuel')
    year_min = filters.NumberFilter(field_name='year_num', lookup_expr='gte')
    year_max = filters.NumberFilter(field_name='year_num', lookup_expr='lte')
    price_min = filters.NumberFilter(field_name='price_num', lookup_expr='gte')
    price_max = filters.NumberFilter(field_name='price_num', lookup_expr='lte')
    mileage_min = filters.NumberFilter(field_name='mileage_num', lookup_expr='gte')
    mileage_max = filters.NumberFilter(field_name='mileage_num', lookup_expr='lte')
    is_seen = filters.BooleanFilter(field_name='is_seen')
    is_favorite = filters.BooleanFilter(field_name='is_favorite')
    created_before = filters.IsoDateTimeFilter(field_name='created_at', lookup_expr='lt')
    has_price = filters.BooleanFilter(method='filter_has_price')
    published_after = filters.CharFilter(method='filter_published_after')
    published_before = filters.CharFilter(method='filter_published_before')
    period = filters.CharFilter(method='filter_period')
    within_days = filters.CharFilter(method='filter_period')

    def resolve_relative_date(self, value):
        import re
        from datetime import timedelta
        from django.utils import timezone
        
        match = re.match(r'^(\d+)([dwm])$', value.lower())
        if match:
            num = int(match.group(1))
            unit = match.group(2)
            if unit == 'd':
                delta = timedelta(days=num)
            elif unit == 'w':
                delta = timedelta(weeks=num)
            elif unit == 'm':
                delta = timedelta(days=num * 30)
            else:
                delta = timedelta(0)
            
            current_date = timezone.localtime(timezone.now()).date()
            resolved_date = current_date - delta
            return resolved_date.strftime('%Y.%m.%d')
        return value

    def filter_fuel(self, queryset, name, value):
        fuel_values = []
        if hasattr(self.data, 'getlist'):
            for raw_val in self.data.getlist('fuel'):
                fuel_values.extend([f.strip() for f in raw_val.split(',') if f.strip()])
        elif value:
            fuel_values = [f.strip() for f in value.split(',') if f.strip()]
        
        if fuel_values:
            return queryset.filter(fuel__in=fuel_values)
        return queryset

    def filter_has_price(self, queryset, name, value):
        if value:
            return queryset.exclude(price__isnull=True).exclude(price='').exclude(price='NULL')
        return queryset

    def filter_period(self, queryset, name, value):
        if not value:
            return queryset
        val_str = str(value).strip().upper()
        preset_map = {
            '1D': 1,
            '1W': 7,
            '2W': 14,
            '3W': 21,
            '1M': 30,
            '2M': 60,
            '3M': 90,
        }
        days = preset_map.get(val_str)
        if days is None:
            try:
                days = int(val_str.rstrip('D'))
            except ValueError:
                return queryset
        from django.utils import timezone
        from datetime import timedelta
        cutoff_date = (timezone.localtime().date() - timedelta(days=days)).strftime('%Y.%m.%d')
        return queryset.exclude(date__isnull=True).exclude(date='').filter(date__gte=cutoff_date)

    def filter_published_after(self, queryset, name, value):
        # date field is stored as YYYY.MM.DD — string comparison is lexicographically sortable
        target_date = self.resolve_relative_date(value)
        return queryset.exclude(date__isnull=True).exclude(date='').filter(date__gte=target_date)

    def filter_published_before(self, queryset, name, value):
        target_date = self.resolve_relative_date(value)
        return queryset.exclude(date__isnull=True).exclude(date='').filter(date__lte=target_date)

    class Meta:
        model = Offer
        fields = ['brand', 'model', 'fuel', 'transmission', 'body', 'color', 'number_of_doors', 'imported_status']

class OfferViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OfferSerializer
    filter_backends = [filters.DjangoFilterBackend, OrderingFilter, SearchFilter]
    filterset_class = OfferFilter
    
    # Fields that can be searched (text search)
    search_fields = ['title', 'description', 'equipment', 'location']
    
    # Fields that can be used for sorting
    ordering_fields = ['price_num', 'year_num', 'mileage_num', 'capacity', 'created_at', 'updated_at', 'date']
    
    # Default ordering
    ordering = ['-created_at']

    def get_queryset(self):
        # We cast the char fields to numbers so sorting and range filtering work correctly
        if self.action != 'list':
            queryset = Offer.objects.all()
        else:
            is_archived = self.request.query_params.get('is_archived')
            if is_archived == 'true':
                queryset = Offer.objects.filter(is_archived=True)
            elif is_archived == 'all':
                queryset = Offer.objects.all()
            else:
                queryset = Offer.objects.exclude(is_archived=True)
        return queryset.annotate(
            year_num=Cast('year', IntegerField()),
            price_num=Cast('price', FloatField()),
            mileage_num=Cast('mileage', IntegerField())
        )

    @action(detail=True, methods=['post'])
    def mark_seen(self, request, pk=None):
        offer = self.get_object()
        if not offer.is_seen:
            offer.is_seen = True
            offer.save(update_fields=['is_seen'])
        return Response({'status': 'marked as seen'})

    @action(detail=True, methods=['post'])
    def toggle_favorite(self, request, pk=None):
        offer = self.get_object()
        offer.is_favorite = not offer.is_favorite
        offer.save(update_fields=['is_favorite'])
        return Response({'status': 'toggled', 'is_favorite': offer.is_favorite})

    @action(detail=False, methods=['post'])
    def check_active_chunk(self, request):
        offer_ids = request.data.get('offer_ids', [])
        if not isinstance(offer_ids, list) or not offer_ids:
            return Response({'error': 'offer_ids must be a non-empty list'}, status=400)

        # Cap chunk size to avoid overload (up to 20 IDs)
        clean_ids = [int(i) for i in offer_ids[:20] if str(i).isdigit()]
        if not clean_ids:
            return Response({'results': [], 'archived_ids': [], 'checked_live': 0})

        offers = list(Offer.objects.filter(id__in=clean_ids))
        now = timezone.now()
        cooldown_threshold = now - timedelta(minutes=10)

        to_check = []
        results = []
        archived_ids = []

        for offer in offers:
            is_sold = offer.is_archived or (offer.title and offer.title.startswith('[SPRZEDANE]'))
            if is_sold:
                results.append({
                    'id': offer.id,
                    'is_archived': True,
                    'title': offer.title,
                    'status': 'already_archived'
                })
                archived_ids.append(offer.id)
                continue

            if offer.last_checked_at and offer.last_checked_at >= cooldown_threshold:
                results.append({
                    'id': offer.id,
                    'is_archived': False,
                    'title': offer.title,
                    'status': 'cooldown'
                })
                continue

            to_check.append(offer)

        if to_check:
            import requests
            from bs4 import BeautifulSoup
            from concurrent.futures import ThreadPoolExecutor

            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept-Language": "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7",
            }

            def verify_single(item):
                is_gone = False
                try:
                    res = requests.get(item.url, headers=headers, timeout=8)
                    if res.status_code in (404, 410):
                        is_gone = True
                    elif res.status_code == 200:
                        res.encoding = 'utf-8'
                        bs = BeautifulSoup(res.text, features='html.parser')
                        offer_data = bs.select_one('.hp-listing--view-page, .hp-listing, div.stdBxC')
                        text_lower = res.text.lower()
                        has_gone = (
                            'strona nie została znaleziona' in text_lower or
                            'nie znaleziono ogłoszenia' in text_lower or
                            'ogłoszenie nie istnieje' in text_lower or
                            'ogłoszenie zostało usunięte' in text_lower or
                            'ogłoszenie wygasło' in text_lower or
                            'zostało usunięte' in text_lower or
                            'wygasło' in text_lower
                        )
                        if not offer_data or has_gone:
                            is_gone = True
                except Exception:
                    # Connection error/timeout: do not archive on transient error
                    return item, False, False

                return item, is_gone, True

            with ThreadPoolExecutor(max_workers=min(5, len(to_check))) as executor:
                check_results = list(executor.map(verify_single, to_check))

            for item, is_gone, check_ok in check_results:
                if check_ok:
                    item.last_checked_at = now
                    if is_gone:
                        item.is_archived = True
                        item.archived_by = 'scroll'
                        if item.title and not item.title.startswith('[SPRZEDANE]'):
                            item.title = f"[SPRZEDANE] {item.title}"
                        item.save(update_fields=['is_archived', 'archived_by', 'title', 'last_checked_at', 'updated_at'])
                        archived_ids.append(item.id)
                        results.append({
                            'id': item.id,
                            'is_archived': True,
                            'title': item.title,
                            'status': 'newly_archived'
                        })
                    else:
                        item.save(update_fields=['last_checked_at', 'updated_at'])
                        results.append({
                            'id': item.id,
                            'is_archived': False,
                            'title': item.title,
                            'status': 'active'
                        })
                else:
                    results.append({
                        'id': item.id,
                        'is_archived': item.is_archived,
                        'title': item.title,
                        'status': 'check_error'
                    })

        return Response({
            'results': results,
            'archived_ids': archived_ids,
            'total_requested': len(clean_ids),
            'checked_live': len(to_check)
        })

class SavedSearchViewSet(viewsets.ModelViewSet):
    queryset = SavedSearch.objects.all().order_by('-created_at')
    serializer_class = SavedSearchSerializer

    @action(detail=True, methods=['post'])
    def mark_all_seen(self, request, pk=None):
        saved_search = self.get_object()
        from django.http import QueryDict
        from django.db.models import Q
        
        qdict = QueryDict(saved_search.query_string).copy()
        if 'fuel' in qdict:
            fuel_list = [f.strip() for val in qdict.getlist('fuel') for f in val.split(',') if f.strip()]
            qdict['fuel'] = ','.join(fuel_list)
            
        base_qs = Offer.objects.annotate(
            year_num=Cast('year', IntegerField()),
            price_num=Cast('price', FloatField()),
            mileage_num=Cast('mileage', IntegerField())
        ).exclude(is_archived=True)
        
        f = OfferFilter(qdict, queryset=base_qs)
        qs = f.qs
        search_term = qdict.get('search')
        if search_term:
            for term in search_term.split():
                qs = qs.filter(
                    Q(title__icontains=term) |
                    Q(description__icontains=term) |
                    Q(equipment__icontains=term) |
                    Q(location__icontains=term)
                )
        updated = qs.filter(is_seen=False).update(is_seen=True)
        return Response({'status': 'marked all seen', 'updated': updated})

class ScraperStatusViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ScraperStatus.objects.all()
    serializer_class = ScraperStatusSerializer

    @action(detail=True, methods=['post'])
    def trigger(self, request, pk=None):
        status = self.get_object()
        if status.is_running:
            return Response({'status': 'error', 'message': 'Already running'}, status=400)
        status.force_scrape = True
        status.save()
        return Response({'status': 'Scrape triggered'})

    @action(detail=True, methods=['post'])
    def test_telegram(self, request, pk=None):
        from .telegram_utils import send_telegram_message
        success, error_msg = send_telegram_message(
            "🧪 <b>Wiadomość Testowa</b>\n\nTwoja konfiguracja bota Telegram działa poprawnie!",
            return_error=True
        )
        if success:
            return Response({'status': 'success', 'message': 'Wiadomość testowa wysłana!'})
        return Response({'status': 'error', 'message': error_msg or 'Błąd wysyłania wiadomości.'}, status=400)

class ScraperLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ScraperLogSerializer

    def get_queryset(self):
        return ScraperLog.objects.all().order_by('-timestamp')[:50]

def index(request):
    return render(request, 'scraper/index.html')
