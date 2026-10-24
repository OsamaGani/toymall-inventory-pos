from django.core.management.base import BaseCommand, CommandError

from shops.models import Shop


class Command(BaseCommand):
    help = "Create the default ToyMall shops."

    def add_arguments(self, parser):
        parser.add_argument(
            "--pin",
            type=str,
            required=True,
            help="PIN to assign to all newly created shops.",
        )

    def handle(self, *args, **options):
        pin = options["pin"]

        if not pin.isdigit():
            raise CommandError("Shop PIN must contain only numbers.")

        if len(pin) < 4:
            raise CommandError("Shop PIN must be at least 4 digits.")

        shops = [
            {
                "name": "Retail Shop 1",
                "shop_type": Shop.RETAIL,
            },
            {
                "name": "Retail Shop 2",
                "shop_type": Shop.RETAIL,
            },
            {
                "name": "Retail Shop 3",
                "shop_type": Shop.RETAIL,
            },
            {
                "name": "Retail Shop 4",
                "shop_type": Shop.RETAIL,
            },
            {
                "name": "Wholesale Shop",
                "shop_type": Shop.WHOLESALE,
            },
        ]

        created_count = 0
        existing_count = 0

        for shop_data in shops:
            shop, created = Shop.objects.get_or_create(
                name=shop_data["name"],
                defaults={
                    "shop_type": shop_data["shop_type"],
                    "active": True,
                },
            )

            if created:
                shop.set_shop_pin(pin)
                shop.save(update_fields=["shop_pin", "updated_at"])

                created_count += 1

                self.stdout.write(
                    self.style.SUCCESS(
                        f"Created: {shop.name}"
                    )
                )
            else:
                existing_count += 1

                self.stdout.write(
                    self.style.WARNING(
                        f"Already exists: {shop.name}"
                    )
                )

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Created: {created_count} shop(s)"
            )
        )

        self.stdout.write(
            self.style.WARNING(
                f"Already existing: {existing_count} shop(s)"
            )
        )

        self.stdout.write(
            self.style.SUCCESS(
                "ToyMall shop setup completed."
            )
        )