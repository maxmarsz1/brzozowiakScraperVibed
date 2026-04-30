from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OfferViewSet, SavedSearchViewSet, index

router = DefaultRouter()
router.register(r'offers', OfferViewSet, basename='offer')
router.register(r'saved_searches', SavedSearchViewSet, basename='saved_search')

urlpatterns = [
    path('api/', include(router.urls)),
    path('', index, name='index'),
]
