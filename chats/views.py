import json
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponseForbidden
from django.shortcuts import render, get_object_or_404
from django.views.decorators.http import require_POST, require_GET
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from user_model.models import User
from chats.models import Chat, Message
from chats.presence import is_user_online
from chats.consumers import build_last_message


@login_required
def messenger_view(request):
    chats = request.user.chats.all().prefetch_related("participants")
    prepared_chats = []

    for chat in chats:
        if chat.chat_type == 'dialog':
            other = chat.get_other_participant(request.user)
            if not other:
                continue
            last_message = chat.get_last_message()
            unread_count = chat.messages.filter(
                is_read=False, author=other
            ).count()
            prepared_chats.append({
                'type': 'dialog',
                'user': other,
                'chat': chat,
                'last_message': last_message,
                'unread_count': unread_count
            })
        else:
            last_message = chat.get_last_message()
            unread_count = chat.messages.filter(
                is_read=False
            ).exclude(author=request.user).count()
            prepared_chats.append({
                'type': 'group',
                'chat': chat,
                'title': chat.title,
                'last_message': last_message,
                'unread_count': unread_count,
                'slug': chat.slug
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
def group_chat_view(request, slug):
    chat = get_object_or_404(Chat, slug=slug, chat_type='group')
    if request.user not in chat.participants.all():
        return HttpResponseForbidden("You are not a member of this group")

    chat.messages.filter(is_read=False).exclude(author=request.user).update(is_read=True)
    messages = chat.messages.select_related("author")

    return render(request, "chats/group_chat_window.html", {
        "chat": chat,
        "messages": messages,
        "current_user": request.user.username,
        "participants": chat.participants.all(),
    })

@login_required
@require_GET
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

    participants = chat.participants.all()
    for participant in participants:
        unread_count = chat.messages.filter(
            is_read=False
        ).exclude(author=participant).count()

        sidebar_data = {
            "type": "sidebar.update",
            "chat_id": chat.id,
            "sender_username": request.user.username,
            "last_message": build_last_message(message),
            "time": message.created_at.strftime("%H:%M"),
            "unread_count": unread_count,
            "chat_type": chat.chat_type,
        }
        if chat.chat_type == 'group':
            sidebar_data["chat_title"] = chat.title
            sidebar_data["chat_slug"] = chat.slug

        async_to_sync(channel_layer.group_send)(
            f"user_{participant.id}",
            sidebar_data
        )

    return render(request, "chats/message_fragment.html", {
        "message": message,
        "current_user": request.user.username
    })

@login_required
@require_GET
def check_user_view(request):
    username = request.GET.get('username', '').strip()
    if not username:
        return JsonResponse({'error': 'Username required'}, status=400)
    user_exists = User.objects.filter(username=username).exists()
    if not user_exists:
        return JsonResponse({'error': 'User not found'}, status=404)
    return JsonResponse({'exists': True})

@login_required
@require_POST
def create_group_view(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    name = data.get('name', '').strip()
    usernames = data.get('usernames', [])

    if not name:
        return JsonResponse({'error': 'Group name required'}, status=400)
    if not usernames:
        return JsonResponse({'error': 'At least one participant required'}, status=400)

    participants = []
    for username in usernames:
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return JsonResponse({'error': f'User "{username}" not found'}, status=400)
        participants.append(user)

    chat = Chat.objects.create(
        chat_type='group',
        title=name
    )
    chat.participants.add(request.user, *participants)
    chat.save()

    return JsonResponse({
        'success': True,
        'chat_id': chat.id,
        'slug': chat.slug,
        'redirect_url': f'/chat/group/{chat.slug}/'
    })
