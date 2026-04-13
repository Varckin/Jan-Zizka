let _wasVoiceSending = false;

function initChatWindow() {
    const chatWindow = document.getElementById("chat-window");
    if (!chatWindow) return;
    if (chatWindow.dataset.initialized === "true") return;
    chatWindow.dataset.initialized = "true";

    const recipientUsername = chatWindow.dataset.username;
    const currentUsername = chatWindow.dataset.currentUser;
    const messageContainer = document.getElementById("chat-messages");
    const chatForm = document.getElementById("chat-form");
    const messageInput = document.getElementById("message-input");

    if (!messageContainer || !chatForm || !messageInput) return;

    function updateSidebarPreview(text) {
        const sidebarLink = document.querySelector(`a.chat-link[data-username="${recipientUsername}"]`);
        if (!sidebarLink) return;

        const lastMsgEl = sidebarLink.querySelector('.last-message');
        if (lastMsgEl) {
            lastMsgEl.textContent = text;
            lastMsgEl.classList.remove('muted');
        }

        const badge = sidebarLink.querySelector('.unread-badge');
        if (badge) {
            badge.textContent = '0';
            badge.style.display = 'none';
        }
    }

    const activeChatLink = document.querySelector(`a.chat-link[data-username="${recipientUsername}"]`);
    if (activeChatLink) {
        const badge = activeChatLink.querySelector('.unread-badge');
        if (badge) {
            badge.textContent = '0';
            badge.style.display = 'none';
        }
    }

    if (window._chatSocket && window._chatSocket.readyState !== WebSocket.CLOSED) {
        window._chatSocket.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    window._chatSocket = new WebSocket(`${protocol}//${window.location.host}/ws/chat/${recipientUsername}/`);

    messageInput.addEventListener("input", () => {
        messageInput.style.height = "auto";
        messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + "px";
    });

    window._chatSocket.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            if (data.type === "chat_message") {
                appendMessage(data.user, data.message, data.time);

                updateSidebarPreview(
                    data.message.length > 35 ? data.message.substring(0, 35) + '...' : data.message
                );

                if (window._chatSocket.readyState === WebSocket.OPEN) {
                    window._chatSocket.send(JSON.stringify({ type: "mark_read" }));
                }
            }
        } catch (err) {
            console.error("Failed to parse message:", err);
        }
    };

    window._chatSocket.onopen = () => console.log("✅ Chat WebSocket connected");
    window._chatSocket.onclose = () => console.log("🔌 Chat WebSocket disconnected");
    window._chatSocket.onerror = (err) => console.error("❌ Chat WebSocket error", err);

    chatForm.addEventListener("submit", (e) => {
        const voiceInput = document.getElementById("voice-input");
        const hasVoice = voiceInput && voiceInput.files.length > 0;
        const text = messageInput.value.trim();

        _wasVoiceSending = hasVoice;

        if (!text && !hasVoice) {
            e.preventDefault();
            return;
        }

        if (hasVoice) {
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const msgDiv = document.createElement("div");
            msgDiv.className = "chat-message my-message";
            msgDiv.innerHTML = `<p>🎤 Voice message</p><span class="msg-time">${timeStr}</span>`;
            messageContainer.appendChild(msgDiv);

            requestAnimationFrame(scrollToBottom);

            updateSidebarPreview("🎤 Voice message");

            return;
        }

        e.preventDefault();
        if (window._chatSocket.readyState === WebSocket.OPEN) {
            window._chatSocket.send(JSON.stringify({ message: text }));
        }

        updateSidebarPreview(
            text.length > 35 ? text.substring(0, 35) + '...' : text
        );

        messageInput.value = "";
        messageInput.style.height = "auto";
        messageInput.focus();
    });

    function appendMessage(user, text, time) {
        const emptyState = document.getElementById('empty-chat-state');
        if (emptyState) emptyState.remove();
        
        const isMyMessage = user === currentUsername;
        const msgDiv = document.createElement("div");
        msgDiv.className = `chat-message ${isMyMessage ? "my-message" : "other-message"}`;
        
        msgDiv.innerHTML = `<p>${escapeHtml(text)}</p><span class="msg-time">${time}</span>`;
        
        messageContainer.appendChild(msgDiv);
        requestAnimationFrame(scrollToBottom);
    }

    function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    function scrollToBottom() {
        messageContainer.scrollTo({
            top: messageContainer.scrollHeight,
            behavior: "smooth"
        });
    }

    if (messageContainer.children.length > 0) {
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }

    const recipientId = parseInt(chatWindow.dataset.userId);

    if (!window._statusPollingStarted) {
        startStatusPolling(recipientId);
        window._statusPollingStarted = true;
    }
}

document.addEventListener("DOMContentLoaded", initChatWindow);
document.addEventListener("htmx:afterSwap", (evt) => {
    if (
        evt.detail.target.closest('.chat-window-placeholder') || 
        evt.detail.target.classList.contains('chat-window-placeholder')
    ) {
        initChatWindow();
    }
});

document.body.addEventListener("htmx:afterRequest", () => {
    if (!_wasVoiceSending) return;

    const voiceInput = document.getElementById("voice-input");
    if (voiceInput) {
        voiceInput.value = "";
    }

    requestAnimationFrame(() => {
        const container = document.getElementById("chat-messages");
        if (container) {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: "smooth"
            });
        }
    });

    _wasVoiceSending = false;
});

function initSidebarSocket() {
    const chatList = document.querySelector('.chat-list');
    if (!chatList) return;
    if (window._sidebarSocket && window._sidebarSocket.readyState !== WebSocket.CLOSED) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    window._sidebarSocket = new WebSocket(`${protocol}//${window.location.host}/ws/sidebar/`);

    window._sidebarSocket.onopen = () => {
        console.log('✅ Sidebar WebSocket connected');
        startHeartbeat();
    };
    window._sidebarSocket.onclose = () => console.log('🔌 Sidebar WebSocket disconnected');
    window._sidebarSocket.onerror = (err) => console.error('❌ Sidebar WS error:', err);

    window._sidebarSocket.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);

            if (data.type === 'sidebar.update') {
                updateSidebarItem(data);
            }

            if (data.type === 'user_status') {
                updateUserStatus(data);
            }

        } catch (err) {
            console.error('Failed to parse sidebar update:', err);
        }
    };
}

function updateSidebarItem(data) {
    const chatLink = document.querySelector(`a.chat-link[data-username="${data.sender_username}"]`);
    if (!chatLink) return;

    const isOpened = document.getElementById('chat-window')?.dataset.username === data.sender_username;
    if (isOpened) return;

    const lastMsg = chatLink.querySelector('.last-message');
    if (lastMsg) {
        lastMsg.textContent = data.last_message || "🎤 Voice message";
        lastMsg.classList.remove('muted');
    }

    const badge = chatLink.querySelector('.unread-badge');
    if (badge) {
        badge.textContent = data.unread_count;
        badge.style.display = data.unread_count > 0 ? 'inline-block' : 'none';
    }
}

document.addEventListener("DOMContentLoaded", initSidebarSocket);
document.addEventListener("htmx:afterSwap", (evt) => {
    if (
        evt.detail.target.closest('.chat-list') || 
        evt.detail.target.classList.contains('chat-list')
    ) {
        initSidebarSocket();
    }
});

function startHeartbeat() {
    if (!window._sidebarSocket) return;

    setInterval(() => {
        if (window._sidebarSocket.readyState === WebSocket.OPEN) {
            window._sidebarSocket.send(JSON.stringify({ type: "ping" }));
        }
    }, 5000);
}

function updateUserStatus(data) {
    const chatWindow = document.getElementById('chat-window');
    if (!chatWindow) return;

    const recipientId = parseInt(chatWindow.dataset.userId);

    if (data.user_id !== recipientId) return;

    updateStatusUI(data.status === "online");
}

let statusInterval = null;

function startStatusPolling(userId) {
    if (statusInterval) return;

    statusInterval = setInterval(async () => {
        try {
            const res = await fetch(`/chat/user_status/${userId}/`);
            const data = await res.json();

            updateStatusUI(data.is_online);

        } catch (err) {
            console.error("Status check failed:", err);
        }
    }, 5000);
}

function updateStatusUI(isOnline) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');

    if (!statusDot || !statusText) return;

    if (isOnline) {
        statusDot.classList.add("online");
        statusText.textContent = "online";
    } else {
        statusDot.classList.remove("online");
        statusText.textContent = "offline";
    }
}

window.addEventListener("beforeunload", () => {
    if (statusInterval) {
        clearInterval(statusInterval);
        statusInterval = null;
    }
});