from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404
from django.views.decorators.http import require_POST
from user_model.models import User
from chats.models import Chat, Message
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from chats.presence import is_user_online
from chats.consumers import build_last_message


@login_required
def messenger_view(request):
    chats = request.user.chats.all().prefetch_related("participants")

    prepared_chats = []

    for chat in chats:
        other = chat.get_other_participant(request.user)
        last_message = chat.get_last_message()

        if other:
            prepared_chats.append({
                "user": other,
                "chat": chat,
                "last_message": last_message
            })

    return render(request, "chats/messenger.html", {
        "chats": prepared_chats
    })


@login_required
def dialog_view(request, username):
    recipient = get_object_or_404(User, username=username)

    chat = Chat.get_or_create_dialog(request.user, recipient)
    chat.messages.filter(is_read=False).exclude(author=request.user).update(is_read=True)

    messages = chat.messages.select_related("author")

    return render(request, "chats/chat_window.html", {
        "chat": chat,
        "recipient": recipient,
        "is_online": is_user_online(recipient.id),
        "messages": messages,
        "current_user": request.user.username
    })

@login_required
def user_status_view(request, user_id):
    return JsonResponse({
        "user_id": user_id,
        "is_online": is_user_online(user_id)
    })

@login_required
@require_POST
def send_message_view(request):
    chat_id = request.POST.get("chat_id")
    chat = get_object_or_404(Chat, id=chat_id)
    
    if request.user not in chat.participants.all():
        return JsonResponse({"error": "Access Denied"}, status=403)

    text = request.POST.get("text", "").strip()
    attachment_file = request.FILES.get("attachment")

    if not text and not attachment_file:
        return JsonResponse({"error": "Message Empty"}, status=400)

    if attachment_file and attachment_file.size > 25 * 1024 * 1024:
        return JsonResponse({"error": "The file is too large (max. 25MB)"}, status=400)

    message = Message.objects.create(
        chat=chat,
        author=request.user,
        text=text,
        attachment=attachment_file
    )

    channel_layer = get_channel_layer()

    async_to_sync(channel_layer.group_send)(
        f"chat_{chat.id}",
        {
            "type": "chat.message",
            "message": message.text,
            "user": request.user.username,
            "time": message.created_at.strftime("%H:%M"),
            "attachment": message.attachment.url if message.attachment else None,
            "attachment_type": message.attachment_type,
        }
    )

    recipient = chat.get_other_participant(request.user)

    unread_count_recipient = chat.messages.filter(
        is_read=False,
        author=request.user
    ).count()

    async_to_sync(channel_layer.group_send)(
        f"user_{recipient.id}",
        {
            "type": "sidebar.update",
            "chat_id": chat.id,
            "sender_username": request.user.username,
            "last_message": build_last_message(message),
            "time": message.created_at.strftime("%H:%M"),
            "unread_count": unread_count_recipient,
        }
    )

    async_to_sync(channel_layer.group_send)(
        f"user_{request.user.id}",
        {
            "type": "sidebar.update",
            "chat_id": chat.id,
            "sender_username": recipient.username,
            "last_message": build_last_message(message),
            "time": message.created_at.strftime("%H:%M"),
            "unread_count": 0,
        }
    )

    return render(request, "chats/message_fragment.html", {
        "message": message, "current_user": request.user.username
    })
