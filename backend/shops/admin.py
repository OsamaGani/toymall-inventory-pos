from django import forms
from django.contrib import admin

from .models import Shop


class ShopAdminForm(forms.ModelForm):
    shop_pin = forms.CharField(
        label="Shop PIN",
        required=False,
        widget=forms.PasswordInput(
            render_value=False
        ),
        help_text="Enter a new PIN only when setting or changing the shop PIN.",
    )

    class Meta:
        model = Shop
        fields = "__all__"


@admin.register(Shop)
class ShopAdmin(admin.ModelAdmin):
    form = ShopAdminForm

    list_display = (
        "id",
        "name",
        "shop_type",
        "phone",
        "active",
        "created_at",
    )

    list_filter = (
        "shop_type",
        "active",
    )

    search_fields = (
        "name",
        "phone",
    )

    ordering = (
        "id",
    )

    def save_model(self, request, obj, form, change):
        raw_pin = form.cleaned_data.get("shop_pin")

        if raw_pin:
            obj.set_shop_pin(raw_pin)

        super().save_model(request, obj, form, change)