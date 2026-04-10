from django.db import models
from user_model.models import User


class Chat(models.Model):
    CHAT_TYPES = [
        ("dialog", "Dialog"),
        ("group", "Group"),
    ]
    chat_type = models.CharField(max_length=10, choices=CHAT_TYPES)
    title = models.CharField(max_length=255, blank=True)
    slug = models.SlugField(unique=True, blank=True, null=True)
    participants = models.ManyToManyField(User, related_name="chats")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title or f"Dialog {self.id}"
    
    def get_other_participant(self, user):
        return self.participants.exclude(id=user.id).first()

    def get_last_message(self):
        return self.messages.select_related("author").order_by("-created_at").first()
    
    @staticmethod
    def get_or_create_dialog(user1, user2):
        chat = Chat.objects.filter(
            chat_type="dialog",
            participants=user1
        ).filter(
            participants=user2
        ).first()

        if chat:
            return chat

        chat = Chat.objects.create(chat_type="dialog")
        chat.participants.add(user1, user2)
        return chat

class Message(models.Model):
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name="messages")
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="messages")
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["chat", "created_at"]),
        ]

    def __str__(self):
        return f"{self.author}: {self.text[:30]}"
