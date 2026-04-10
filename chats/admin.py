from django.contrib import admin
from chats.models import Chat, Message


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ("author", "text", "created_at", "is_read")
    ordering = ("-created_at",)


@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
    list_display = (
        "id", "chat_type", "title", "participants_count", 
        "last_message_preview", "created_at"
    )
    list_filter = ("chat_type", "created_at")
    search_fields = ("title", "participants__username", "participants__email")
    readonly_fields = ("created_at", "updated_at")
    filter_horizontal = ("participants",)
    inlines = [MessageInline]
    ordering = ("-created_at",)

    @admin.display(description="Participants")
    def participants_count(self, obj):
        return obj.participants.count()

    @admin.display(description="Last Message")
    def last_message_preview(self, obj):
        msg = obj.get_last_message()
        return f"{msg.author}: {msg.text[:30]}..." if msg else "No messages"


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "chat", "author", "text_short", "is_read", "created_at")
    list_filter = ("is_read", "chat__chat_type", "created_at")
    search_fields = ("author__username", "text", "chat__title")
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)
    date_hierarchy = "created_at"

    @admin.display(description="Text")
    def text_short(self, obj):
        return obj.text[:50] + "..." if len(obj.text) > 50 else obj.text
