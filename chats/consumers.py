from channels.generic.websocket import AsyncJsonWebsocketConsumer
from asgiref.sync import sync_to_async
from django.utils import timezone

from chats.models import Chat, Message
from user_model.models import User

from chats.presence import set_user_online


def build_last_message(msg):
    if msg.attachment_type == "audio":
        return "🎤 Voice message"
    elif msg.attachment:
        return "📎 Attachment"
    return msg.text or "Message"

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
        msg_type = content.get("type")

        if msg_type == "mark_read":
            await self.mark_as_read()
            return
        
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
                "attachment": None,
                "attachment_type": None,
            }
        )

        await self.send_sidebar_update(msg)

    async def send_sidebar_update(self, msg):
        recipient_group = f"user_{self.recipient.id}"

        unread_count = await sync_to_async(
            lambda: self.chat.messages.filter(
                is_read=False,
                author=self.user
            ).count()
        )()

        await self.channel_layer.group_send(
            recipient_group,
            {
                "type": "sidebar.update",
                "chat_id": self.chat.id,
                "sender_username": self.user.username,
                "last_message": build_last_message(msg),
                "time": msg.created_at.strftime("%H:%M"),
                "unread_count": unread_count,
            }
        )

    async def mark_as_read(self):
        await sync_to_async(
            lambda: Message.objects.filter(
                chat=self.chat,
                is_read=False
            ).exclude(author=self.user).update(is_read=True)
        )()

    async def chat_message(self, event):
        await self.send_json({
            "type": "chat_message",
            "message": event["message"],
            "user": event["user"],
            "time": event["time"],
            "attachment": event.get("attachment"),
            "attachment_type": event.get("attachment_type"),
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

class SidebarConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        if self.user.is_anonymous:
            await self.close()
            return

        self.group_name = f"user_{self.user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)

        await self.channel_layer.group_add("online_status", self.channel_name)
        await sync_to_async(set_user_online)(self.user.id)

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        await self.channel_layer.group_discard("online_status", self.channel_name)

    async def receive_json(self, content, **kwargs):
        msg_type = content.get("type")

        if msg_type == "ping":
            await self.handle_ping()

    async def handle_ping(self):
        await sync_to_async(set_user_online)(self.user.id)
        await self.send_json({"type": "pong"})

        await self.channel_layer.group_send(
            "online_status",
            {
                "type": "user.status",
                "user_id": self.user.id,
                "status": "online"
            }
        )

    async def user_status(self, event):
        await self.send_json({
            "type": "user_status",
            "user_id": event["user_id"],
            "status": event["status"],
        })

    async def sidebar_update(self, event):
        await self.send_json(event)
