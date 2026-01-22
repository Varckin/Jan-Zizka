from django import forms
from user_model.models import User


class ProfileEditForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ("first_name", "last_name", "bio", "avatar")

        widgets = {
            "first_name": forms.TextInput(attrs={
                "class": "input",
                "placeholder": "First name",
            }),
            "last_name": forms.TextInput(attrs={
                "class": "input",
                "placeholder": "Last name",
            }),
            "bio": forms.Textarea(attrs={
                "class": "textarea",
                "rows": 4,
                "placeholder": "Tell something about yourself",
            }),
            "avatar": forms.FileInput(attrs={
                "class": "input-file",
            }),
        }
