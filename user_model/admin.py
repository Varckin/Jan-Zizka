from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django import forms
from django.contrib.auth.forms import ReadOnlyPasswordHashField
from user_model.models import User


class UserCreationForm(forms.ModelForm):
    password1 = forms.CharField(label="Password", widget=forms.PasswordInput)
    password2 = forms.CharField(label="Confirm password", widget=forms.PasswordInput)

    class Meta:
        model = User
        fields = ("email", "username", "first_name")

    def clean_password2(self):
        p1 = self.cleaned_data.get("password1")
        p2 = self.cleaned_data.get("password2")
        if p1 and p2 and p1 != p2:
            raise forms.ValidationError("Passwords do not match")
        return p2

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        if commit:
            user.save()
        return user


class UserChangeForm(forms.ModelForm):
    password = ReadOnlyPasswordHashField(label="Password")

    class Meta:
        model = User
        fields = (
            "email", "username", "first_name", "last_name",
            "bio", "avatar",
            "is_active", "is_staff", "is_superuser",
            "groups", "user_permissions",
        )


@admin.register(User)
class UserAdmin(UserAdmin):
    add_form = UserCreationForm
    form = UserChangeForm
    model = User

    list_display = ("email", "username", "first_name", "is_staff", "is_active", "last_login")
    list_filter = ("is_staff", "is_superuser", "is_active", "groups")

    ordering = ("email",)
    search_fields = ("email", "username", "first_name", "last_name")

    fieldsets = (
        (None, {"fields": ("email", "username", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "bio", "avatar")}),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "username", "first_name", "password1", "password2", "is_staff", "is_superuser"),
        }),
    )
