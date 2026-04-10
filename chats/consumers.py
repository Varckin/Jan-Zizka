from channels.generic.websocket import AsyncJsonWebsocketConsumer
from asgiref.sync import sync_to_async
from django.utils import timezone

from chats.models import Chat, Message
from user_model.models import User


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]

        if self.user.is_anonymous:
            await self.close()
            return

        self.username = self.scope["url_route"]["kwargs"]["username"]

        self.recipient = await self.get_user(self.username)
        self.chat = await self.get_chat(self.user, self.recipient)

        self.room_group_name = f"chat_{self.chat.id}"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive_json(self, content, **kwargs):
        message = content.get("message")

        if not message:
            return

        msg = await self.save_message(
            chat=self.chat,
            user=self.user,
            text=message
        )

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat.message",
                "message": msg.text,
                "user": self.user.username,
                "time": msg.created_at.strftime("%H:%M"),
            }
        )

    async def chat_message(self, event):
        await self.send_json({
            "type": "chat_message",
            "message": event["message"],
            "user": event["user"],
            "time": event["time"],
        })

    @sync_to_async
    def get_user(self, username):
        return User.objects.get(username=username)

    @sync_to_async
    def get_chat(self, user1, user2):
        return Chat.get_or_create_dialog(user1, user2)

    @sync_to_async
    def save_message(self, chat, user, text):
        msg = Message.objects.create(
            chat=chat,
            author=user,
            text=text
        )

        Chat.objects.filter(id=chat.id).update(updated_at=timezone.now())

        return msg
