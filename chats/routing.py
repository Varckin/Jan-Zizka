from django.urls import re_path
from chats.consumers import ChatConsumer, SidebarConsumer, GroupChatConsumer

websocket_urlpatterns = [
    re_path(r"ws/chat/(?P<username>[^/]+)/$", ChatConsumer.as_asgi()),
    re_path(r"ws/sidebar/$", SidebarConsumer.as_asgi()),
    re_path(r"ws/chat/group/(?P<slug>[^/]+)/$", GroupChatConsumer.as_asgi()),
]
