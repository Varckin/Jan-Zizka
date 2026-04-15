from django.urls import path
from chats.views import (messenger_view, dialog_view,
                         user_status_view, send_message_view,
                         check_user_view, create_group_view,
                         group_chat_view)


urlpatterns = [
    path("", messenger_view, name="messenger"),
    path("send_message/", send_message_view, name="send_message"),
    path("user/check/", check_user_view, name="check_user"),
    path("group/create/", create_group_view, name="create_group"),
    path("user_status/<int:user_id>/", user_status_view, name="user_status"),
    path("group/<slug:slug>/", group_chat_view, name="group_chat"),
    path("<str:username>/", dialog_view, name="dialog"),
]
