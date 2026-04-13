from django.contrib.auth.decorators import login_required
from django.shortcuts import render, get_object_or_404
from user_model.models import User
from chats.models import Chat

from chats.presence import is_user_online


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
    chat.messages.filter(is_read=False).update(is_read=True)

    messages = chat.messages.select_related("author")

    return render(request, "chats/chat_window.html", {
        "chat": chat,
        "recipient": recipient,
        "is_online": is_user_online(recipient.id),
        "messages": messages,
        "current_user": request.user.username
    })
