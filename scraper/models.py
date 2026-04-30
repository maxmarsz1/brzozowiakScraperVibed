from django.db import models

class Offer(models.Model):
    offer_id = models.CharField(max_length=50, unique=True, verbose_name="ID")
    url = models.URLField(max_length=2000)
    title = models.CharField(max_length=500, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    date = models.CharField(max_length=100, null=True, blank=True)
    location = models.CharField(max_length=255, null=True, blank=True)
    brand = models.CharField(max_length=100, null=True, blank=True)
    model = models.CharField(max_length=100, null=True, blank=True)
    capacity = models.CharField(max_length=100, null=True, blank=True)
    year = models.CharField(max_length=100, null=True, blank=True)
    transmission = models.CharField(max_length=100, null=True, blank=True)
    fuel = models.CharField(max_length=100, null=True, blank=True)
    body = models.CharField(max_length=100, null=True, blank=True)
    color = models.CharField(max_length=100, null=True, blank=True)
    price = models.CharField(max_length=100, null=True, blank=True)
    km = models.CharField(max_length=100, null=True, blank=True)
    mileage = models.CharField(max_length=100, null=True, blank=True)
    equipment = models.TextField(null=True, blank=True)
    img = models.URLField(max_length=2000, null=True, blank=True)
    
    # New fields discovered
    number_of_doors = models.CharField(max_length=50, null=True, blank=True)
    imported_status = models.CharField(max_length=100, null=True, blank=True)
    usage = models.CharField(max_length=100, null=True, blank=True)
    registration_country = models.CharField(max_length=100, null=True, blank=True)
    mot_valid_until = models.CharField(max_length=100, null=True, blank=True)
    insurance_paid_until = models.CharField(max_length=100, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)
    
    # Flag to track if the offer has been seen in the frontend
    is_seen = models.BooleanField(default=False, null=True)
    is_favorite = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.title} - {self.offer_id}"

class SavedSearch(models.Model):
    name = models.CharField(max_length=200)
    query_string = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
