from django.contrib.auth import authenticate
from rest_framework import serializers
from .models import User


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "role", "is_active", "date_joined")
        read_only_fields = fields


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=1024)

    def validate(self, attrs):
        user = authenticate(request=self.context["request"], email=User.objects.normalize_email(attrs["email"]), password=attrs["password"])
        # Same message for a wrong password, unknown address, or inactive account.
        if user is None or not user.is_active or user.role not in User.Role.values:
            raise serializers.ValidationError("Unable to log in with the provided credentials.")
        return {"user": user}
