from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OfferViewSet, SavedSearchViewSet, ScraperStatusViewSet

router = DefaultRouter()
router.register(r'offers', OfferViewSet, basename='offer')
router.register(r'saved_searches', SavedSearchViewSet, basename='saved_search')
router.register(r'scraper_status', ScraperStatusViewSet, basename='scraper_status')

urlpatterns = [
    path('api/', include(router.urls)),
]
