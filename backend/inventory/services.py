from django.db import transaction
from django.db.models import F

from .models import ShopStock, StockMovement


@transaction.atomic
def add_stock(
    *,
    shop,
    product,
    quantity,
    created_by=None,
    reference_id=None,
    reference_type="STOCK_IN",
    note=None,
):
    if quantity <= 0:
        raise ValueError("Stock quantity must be greater than zero.")

    stock, _ = (
        ShopStock.objects
        .select_for_update()
        .get_or_create(
            shop=shop,
            product=product,
            defaults={"quantity": 0},
        )
    )

    stock.quantity = F("quantity") + quantity
    stock.save(update_fields=["quantity", "updated_at"])

    stock.refresh_from_db()

    movement = StockMovement.objects.create(
        shop=shop,
        product=product,
        movement_type=StockMovement.STOCK_IN,
        quantity=quantity,
        reference_id=reference_id,
        reference_type=reference_type,
        note=note,
        created_by=created_by,
    )

    return stock, movement