from django.db import models


class Invoice(models.Model):
    invoice_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True
    )

    sale = models.OneToOneField(
        "sales.Sale",
        on_delete=models.PROTECT,
        related_name="invoice"
    )

    shop = models.ForeignKey(
        "shops.Shop",
        on_delete=models.PROTECT,
        related_name="invoices"
    )

    generated_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "invoices"
        ordering = ["-generated_at"]

        indexes = [
            models.Index(
                fields=["shop", "generated_at"],
                name="idx_invoice_shop_date"
            ),
        ]

    def __str__(self):
        return self.invoice_number