from getpass import getpass
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError


class Command(BaseCommand):
    help = "Privately provision a teacher account; passwords are prompted, not CLI arguments."

    def add_arguments(self, parser):
        parser.add_argument("--email", help="Teacher login email; prompted if omitted.")

    def handle(self, *args, **options):
        email = options["email"] or input("Teacher email: ").strip()
        try:
            password = getpass("Password: ")
            confirmation = getpass("Password (again): ")
        except (EOFError, KeyboardInterrupt) as exc:
            raise CommandError("Account creation cancelled.") from exc
        if password != confirmation:
            raise CommandError("Passwords do not match.")
        User = get_user_model()
        try:
            User.objects.create_user(email=email, password=password, role=User.Role.TEACHER, is_staff=False, is_superuser=False)
        except ValidationError as exc:
            raise CommandError(" ".join(exc.messages)) from None
        except IntegrityError:
            raise CommandError("An account with that email already exists.") from None
        self.stdout.write(self.style.SUCCESS("Teacher account created. No credentials are displayed."))
