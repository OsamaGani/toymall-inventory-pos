from django.db import models


class Category(models.Model):
    name = models.CharField(
        max_length=100,
        unique=True,
    )

    description = models.TextField(
        blank=True,
        null=True,
    )

    active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "categories"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(
        max_length=200,
    )

    sku = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
    )

    barcode = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
    )

    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products",
    )

    purchase_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    selling_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    minimum_selling_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )

    image_url = models.URLField(
        max_length=1000,
        blank=True,
        null=True,
    )

    description = models.TextField(
        blank=True,
        null=True,
    )

    active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "products"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.sku})"