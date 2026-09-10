from rest_framework import serializers
import os
from .models import Offer, SavedSearch, ScraperStatus, ScraperLog
from django.http import QueryDict
from django.db.models import FloatField, IntegerField
from django.db.models.functions import Cast

class OfferSerializer(serializers.ModelSerializer):
    class Meta:
        model = Offer
        fields = '__all__'

class SavedSearchSerializer(serializers.ModelSerializer):
    new_count = serializers.SerializerMethodField()

    class Meta:
        model = SavedSearch
        fields = '__all__'

    def get_new_count(self, obj):
        # Local import to prevent circular dependency
        from .views import OfferFilter
        from django.db.models import Q
        
        qdict = QueryDict(obj.query_string)
        
        base_qs = Offer.objects.annotate(
            year_num=Cast('year', IntegerField()),
            price_num=Cast('price', FloatField()),
            mileage_num=Cast('mileage', IntegerField())
        ).filter(is_seen=False).exclude(is_archived=True)
        
        f = OfferFilter(qdict, queryset=base_qs)
        qs = f.qs
        
        search_term = qdict.get('search')
        if search_term:
            qs = qs.filter(
                Q(title__icontains=search_term) |
                Q(description__icontains=search_term) |
                Q(equipment__icontains=search_term) |
                Q(location__icontains=search_term)
            )
            
        return qs.count()

class ScraperStatusSerializer(serializers.ModelSerializer):
    telegram_configured = serializers.SerializerMethodField()
    next_maintenance_run = serializers.SerializerMethodField()
    archived_today = serializers.SerializerMethodField()
    archived_today_scan = serializers.SerializerMethodField()
    archived_today_maintenance = serializers.SerializerMethodField()
    archived_yesterday = serializers.SerializerMethodField()
    archived_total = serializers.SerializerMethodField()

    class Meta:
        model = ScraperStatus
        fields = '__all__'

    def get_telegram_configured(self, obj):
        token = os.environ.get('TELEGRAM_BOT_TOKEN')
        chat_id = os.environ.get('TELEGRAM_CHAT_ID')
        return bool(token and chat_id)

    def get_next_maintenance_run(self, obj):
        from datetime import timedelta
        from django.utils import timezone
        
        if not obj.last_maintenance_run:
            now = timezone.localtime()
            candidate = now.replace(hour=2, minute=0, second=0, microsecond=0)
            if now.hour >= 2:
                candidate += timedelta(days=1)
            return candidate
            
        last_local = timezone.localtime(obj.last_maintenance_run)
        candidate = last_local + timedelta(days=7)
        return candidate.replace(hour=2, minute=0, second=0, microsecond=0)

    def get_archived_today(self, obj):
        from django.utils import timezone
        now_local = timezone.localtime(timezone.now())
        start_of_today = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
        return Offer.objects.filter(is_archived=True, updated_at__gte=start_of_today).count()

    def get_archived_today_scan(self, obj):
        from django.utils import timezone
        now_local = timezone.localtime(timezone.now())
        start_of_today = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
        return Offer.objects.filter(is_archived=True, archived_by='scan', updated_at__gte=start_of_today).count()

    def get_archived_today_maintenance(self, obj):
        from django.utils import timezone
        now_local = timezone.localtime(timezone.now())
        start_of_today = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
        return Offer.objects.filter(is_archived=True, archived_by='maintenance', updated_at__gte=start_of_today).count()

    def get_archived_yesterday(self, obj):
        from datetime import timedelta
        from django.utils import timezone
        now_local = timezone.localtime(timezone.now())
        start_of_today = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
        start_of_yesterday = start_of_today - timedelta(days=1)
        return Offer.objects.filter(is_archived=True, updated_at__gte=start_of_yesterday, updated_at__lt=start_of_today).count()

    def get_archived_total(self, obj):
        return Offer.objects.filter(is_archived=True).count()

class ScraperLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScraperLog
        fields = '__all__'
