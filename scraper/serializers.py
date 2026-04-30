from rest_framework import serializers
from .models import Offer, SavedSearch
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
        ).filter(is_seen=False)
        
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
