from django.urls import path
from chats.views import messenger_view, dialog_view, user_status_view


urlpatterns = [
    path("", messenger_view, name="messenger"),
    path("<str:username>/", dialog_view, name="dialog"),
    path("user_status/<int:user_id>/", user_status_view, name="user_status")
]
