from django.contrib.auth.hashers import check_password, make_password
from django.db import models


class Shop(models.Model):
    RETAIL = "RETAIL"
    WHOLESALE = "WHOLESALE"

    SHOP_TYPE_CHOICES = [
        (RETAIL, "Retail"),
        (WHOLESALE, "Wholesale"),
    ]

    name = models.CharField(max_length=100, unique=True)

    shop_type = models.CharField(
        max_length=20,
        choices=SHOP_TYPE_CHOICES
    )

    address = models.TextField(
        blank=True,
        null=True
    )

    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True
    )

    active = models.BooleanField(default=True)

    shop_pin = models.CharField(
        max_length=128,
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "shops"
        ordering = ["id"]

    @property
    def is_authenticated(self):
        return True

    def __str__(self):
        return self.name

    def set_shop_pin(self, raw_pin):
        """
        Securely hash and store the shop PIN.
        """
        self.shop_pin = make_password(raw_pin)

    def check_shop_pin(self, raw_pin):
        """
        Verify the entered PIN against the stored hash.
        """
        if not self.shop_pin:
            return False

        return check_password(raw_pin, self.shop_pin)