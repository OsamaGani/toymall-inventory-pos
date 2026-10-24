from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models


class InvoiceCounter(models.Model):
    """
    Stores the last generated invoice sequence number.

    A single database row is locked with select_for_update()
    whenever a new invoice number is generated.
    """

    name = models.CharField(
        max_length=50,
        unique=True,
        default="TOYMALL",
    )

    last_number = models.PositiveBigIntegerField(
        default=0,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        db_table = "invoice_counters"

    def __str__(self):
        return f"{self.name}: {self.last_number}"


class Sale(models.Model):
    RETAIL = "RETAIL"
    WHOLESALE = "WHOLESALE"

    SALE_TYPE_CHOICES = [
        (RETAIL, "Retail"),
        (WHOLESALE, "Wholesale"),
    ]

    CASH = "CASH"
    UPI = "UPI"
    CARD = "CARD"
    CREDIT = "CREDIT"
    OTHER = "OTHER"

    PAYMENT_METHOD_CHOICES = [
        (CASH, "Cash"),
        (UPI, "UPI"),
        (CARD, "Card"),
        (CREDIT, "Credit"),
        (OTHER, "Other"),
    ]

    invoice_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
    )

    shop = models.ForeignKey(
        "shops.Shop",
        on_delete=models.PROTECT,
        related_name="sales",
    )

    sale_type = models.CharField(
        max_length=20,
        choices=SALE_TYPE_CHOICES,
    )

    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    discount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
    )

    created_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales_created",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        db_table = "sales"
        ordering = ["-created_at"]

        indexes = [
            models.Index(
                fields=["shop", "created_at"],
                name="idx_sale_shop_date",
            ),
            models.Index(
                fields=["sale_type", "created_at"],
                name="idx_sale_type_date",
            ),
        ]

    def __str__(self):
        return self.invoice_number


class SaleItem(models.Model):
    sale = models.ForeignKey(
        Sale,
        on_delete=models.CASCADE,
        related_name="items",
    )

    product = models.ForeignKey(
        "products.Product",
        on_delete=models.PROTECT,
        related_name="sale_items",
    )

    quantity = models.PositiveIntegerField()

    regular_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    actual_sale_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    discount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    line_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        db_table = "sale_items"
        ordering = ["id"]

        indexes = [
            models.Index(
                fields=["sale", "product"],
                name="idx_saleitem_sale_product",
            ),
        ]

    def clean(self):
        if self.quantity <= 0:
            raise ValidationError(
                "Quantity must be greater than zero."
            )

        if self.regular_price < 0:
            raise ValidationError(
                "Regular price cannot be negative."
            )

        if self.actual_sale_price < 0:
            raise ValidationError(
                "Sale price cannot be negative."
            )

        if self.discount < 0:
            raise ValidationError(
                "Discount cannot be negative."
            )

    def save(self, *args, **kwargs):
        self.line_total = (
            self.actual_sale_price * self.quantity
        ) - self.discount

        if self.line_total < 0:
            self.line_total = Decimal("0.00")

        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f"{self.sale.invoice_number} - "
            f"{self.product.name}"
        )