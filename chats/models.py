from pathlib import Path
from django.db import models
from django.utils.text import slugify
from user_model.models import User


def user_attachment_path(instance, filename):
    p = Path(filename)
    base_name = slugify(p.stem)
    ext = p.suffix
    safe_filename = f"{base_name}{ext}" if base_name else filename

    return f"chat_attachments/user_{instance.author.username}/{safe_filename}"

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
    
    def save(self, *args, **kwargs):
        if self.chat_type == 'group' and not self.slug:
            base_slug = slugify(self.title) if self.title else f"group-{self.id or ''}"
            slug = base_slug
            counter = 1
            while Chat.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)
    
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
    text = models.TextField(blank=True)
    attachment = models.FileField(upload_to=user_attachment_path, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["chat", "created_at"]),
        ]

    def __str__(self):
        if self.attachment:
            return f"{self.author}: 📎 Attachment"
        return f"{self.author}: {self.text[:30]}"

    @property
    def attachment_type(self):
        if not self.attachment:
            return None
        
        ext = Path(self.attachment.name).suffix.lower()

        audio_exts = ('.mp3', '.wav', '.ogg', '.webm', '.m4a', '.aac', '.opus')
        image_exts = ('.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg')
        video_exts = ('.mp4', '.webm', '.mov', '.avi', '.mkv')
        
        if ext in audio_exts: return 'audio'
        if ext in image_exts: return 'image'
        if ext in video_exts: return 'video'
        
        return 'file'
