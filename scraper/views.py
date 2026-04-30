from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters import rest_framework as filters
from rest_framework.filters import OrderingFilter, SearchFilter
from django.shortcuts import render
from django.db.models import FloatField, IntegerField
from django.db.models.functions import Cast
from .models import Offer, SavedSearch
from .serializers import OfferSerializer, SavedSearchSerializer

class OfferFilter(filters.FilterSet):
    year_min = filters.NumberFilter(field_name='year_num', lookup_expr='gte')
    year_max = filters.NumberFilter(field_name='year_num', lookup_expr='lte')
    price_min = filters.NumberFilter(field_name='price_num', lookup_expr='gte')
    price_max = filters.NumberFilter(field_name='price_num', lookup_expr='lte')
    mileage_min = filters.NumberFilter(field_name='mileage_num', lookup_expr='gte')
    mileage_max = filters.NumberFilter(field_name='mileage_num', lookup_expr='lte')
    is_seen = filters.BooleanFilter(field_name='is_seen')
    is_favorite = filters.BooleanFilter(field_name='is_favorite')
    has_price = filters.BooleanFilter(method='filter_has_price')

    def filter_has_price(self, queryset, name, value):
        if value:
            return queryset.exclude(price__isnull=True).exclude(price='').exclude(price='NULL')
        return queryset

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
    ordering_fields = ['price_num', 'year_num', 'mileage_num', 'capacity', 'created_at', 'updated_at']
    
    # Default ordering
    ordering = ['-created_at']

    def get_queryset(self):
        # We cast the char fields to numbers so sorting and range filtering work correctly
        return Offer.objects.annotate(
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

class SavedSearchViewSet(viewsets.ModelViewSet):
    queryset = SavedSearch.objects.all().order_by('-created_at')
    serializer_class = SavedSearchSerializer

def index(request):
    return render(request, 'scraper/index.html')
