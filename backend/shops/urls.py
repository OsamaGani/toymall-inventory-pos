
from django.urls import path

from .views import (
    ShopListAPIView,
    ShopVerifyPinAPIView,
    ShopMeAPIView,
    ShopOpenSessionAPIView,
)


urlpatterns = [
    path(
        "",
        ShopListAPIView.as_view(),
        name="shop-list",
    ),
    path(
        "verify-pin/",
        ShopVerifyPinAPIView.as_view(),
        name="shop-verify-pin",
    ),
    path(
        "open-session/",
        ShopOpenSessionAPIView.as_view(),
        name="shop-open-session",
    ),
    path(
        "me/",
        ShopMeAPIView.as_view(),
        name="shop-me",
    ),
]
