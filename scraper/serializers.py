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
        ).filter(is_seen=False, is_archived=False)
        
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

    class Meta:
        model = ScraperStatus
        fields = '__all__'

    def get_telegram_configured(self, obj):
        token = os.environ.get('TELEGRAM_BOT_TOKEN')
        chat_id = os.environ.get('TELEGRAM_CHAT_ID')
        return bool(token and chat_id)

class ScraperLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScraperLog
        fields = '__all__'
