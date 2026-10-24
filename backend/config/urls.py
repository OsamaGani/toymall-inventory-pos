from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path


urlpatterns = [
    # =========================================================
    # DJANGO ADMIN
    # =========================================================
    path(
        "admin/",
        admin.site.urls,
    ),

    # =========================================================
    # ADMIN AUTH
    # =========================================================
    path(
        "api/accounts/admin/",
        include("accounts.urls"),
    ),

    # =========================================================
    # SHOPS
    # =========================================================
    path(
        "api/shops/",
        include("shops.urls"),
    ),

    # =========================================================
    # PRODUCTS
    # =========================================================
    path(
        "api/products/",
        include("products.urls"),
    ),

    # =========================================================
    # INVENTORY
    # =========================================================
    path(
        "api/inventory/",
        include("inventory.urls"),
    ),

    # =========================================================
    # SALES
    # =========================================================
    path(
        "api/sales/",
        include("sales.urls"),
    ),

    # =========================================================
    # INVOICES
    # =========================================================
    path(
        "api/invoices/",
        include("invoices.urls"),
    ),
]


# =========================================================
# MEDIA FILES - DEVELOPMENT ONLY
# =========================================================

if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )