from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from shops.authentication import ShopTokenAuthentication

from .models import Invoice
from .serializers import InvoiceSerializer


class InvoiceListAPIView(generics.ListAPIView):
    """
    Returns only invoices belonging to the authenticated shop.
    """

    authentication_classes = [ShopTokenAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = InvoiceSerializer

    def get_queryset(self):
        shop = self.request.user

        return (
            Invoice.objects
            .select_related(
                "shop",
                "sale",
            )
            .prefetch_related(
                "sale__items__product",
            )
            .filter(
                shop=shop,
            )
            .order_by("-generated_at")
        )


class InvoiceDetailAPIView(generics.RetrieveAPIView):
    """
    Returns an invoice only if it belongs to the
    authenticated shop.
    """

    authentication_classes = [ShopTokenAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = InvoiceSerializer

    def get_queryset(self):
        shop = self.request.user

        return (
            Invoice.objects
            .select_related(
                "shop",
                "sale",
            )
            .prefetch_related(
                "sale__items__product",
            )
            .filter(
                shop=shop,
            )
        )