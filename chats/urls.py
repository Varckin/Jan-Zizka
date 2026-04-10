from django.urls import path
from chats.views import messenger_view, dialog_view


urlpatterns = [
    path("", messenger_view, name="messenger"),
    path("<str:username>/", dialog_view, name="dialog"),
]
