from django.db import models


class ShopStock(models.Model):
    shop = models.ForeignKey(
        "shops.Shop",
        on_delete=models.CASCADE,
        related_name="stock_records",
    )

    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="shop_stock",
    )

    quantity = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "shop_stock"
        ordering = ["shop_id", "product_id"]

        constraints = [
            models.UniqueConstraint(
                fields=["shop", "product"],
                name="unique_shop_product_stock",
            ),
        ]

        indexes = [
            models.Index(
                fields=["shop", "product"],
                name="idx_shop_product_stock",
            ),
        ]

    def __str__(self):
        return (
            f"{self.shop.name} - "
            f"{self.product.name} - "
            f"{self.quantity}"
        )

class StockMovement(models.Model):
    STOCK_IN = "STOCK_IN"
    SALE = "SALE"
    TRANSFER_OUT = "TRANSFER_OUT"
    TRANSFER_IN = "TRANSFER_IN"
    ADJUSTMENT = "ADJUSTMENT"
    RETURN = "RETURN"

    MOVEMENT_TYPE_CHOICES = [
        (STOCK_IN, "Stock In"),
        (SALE, "Sale"),
        (TRANSFER_OUT, "Transfer Out"),
        (TRANSFER_IN, "Transfer In"),
        (ADJUSTMENT, "Adjustment"),
        (RETURN, "Return"),
    ]

    shop = models.ForeignKey(
        "shops.Shop",
        on_delete=models.PROTECT,
        related_name="stock_movements",
    )

    product = models.ForeignKey(
        "products.Product",
        on_delete=models.PROTECT,
        related_name="stock_movements",
    )

    movement_type = models.CharField(
        max_length=20,
        choices=MOVEMENT_TYPE_CHOICES,
    )

    quantity = models.PositiveIntegerField()

    reference_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    reference_type = models.CharField(
        max_length=50,
        blank=True,
        null=True,
    )

    note = models.TextField(
        blank=True,
        null=True,
    )

    created_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_movements_created",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "stock_movements"
        ordering = ["-created_at"]

        indexes = [
            models.Index(
                fields=["shop", "product"],
                name="idx_movement_shop_product",
            ),
            models.Index(
                fields=["movement_type"],
                name="idx_movement_type",
            ),
            models.Index(
                fields=["created_at"],
                name="idx_movement_created",
            ),
        ]

    def __str__(self):
        return (
            f"{self.shop.name} - "
            f"{self.product.name} - "
            f"{self.movement_type} - "
            f"{self.quantity}"
        )