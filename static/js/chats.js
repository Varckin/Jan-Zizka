let _wasVoiceSending = false;
let statusInterval = null;

function buildPreview(message, attachment, type) {
    if (type === "audio") return "🎤 Voice message";
    if (attachment) return "📎 Attachment";
    return message.length > 35 ? message.slice(0, 35) + "..." : message;
}

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

    const activeChatLink = document.querySelector(
        `a.chat-link[data-username="${recipientUsername}"]`
    );

    if (activeChatLink) {
        const badge = activeChatLink.querySelector(".unread-badge");
        if (badge) {
            badge.textContent = "0";
            badge.style.display = "none";
        }
    }

    if (window._chatSocket && window._chatSocket.readyState !== WebSocket.CLOSED) {
        window._chatSocket.close();
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

    window._chatSocket = new WebSocket(
        `${protocol}//${window.location.host}/ws/chat/${recipientUsername}/`
    );

    window._chatSocket.onopen = () =>
        console.log("✅ Chat WebSocket connected");

    window._chatSocket.onerror = (err) =>
        console.error("❌ Chat WebSocket error", err);

    window._chatSocket.onclose = () =>
        console.log("🔌 Chat WebSocket disconnected");

    window._chatSocket.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);

            if (data.type !== "chat_message") return;

            appendMessage(
                data.user,
                data.message,
                data.time,
                data.attachment,
                data.attachment_type,
                currentUsername
            );

            updateSidebarPreview(
                buildPreview(
                    data.message,
                    data.attachment,
                    data.attachment_type
                )
            );

            scheduleMarkRead();
        } catch (err) {
            console.error("WS parse error:", err);
        }
    };

    messageInput.addEventListener("input", () => {
        messageInput.style.height = "auto";
        messageInput.style.height =
            Math.min(messageInput.scrollHeight, 120) + "px";
    });

    chatForm.addEventListener("submit", (e) => {
        const voiceInput = document.getElementById("voice-input");
        const hasVoice = voiceInput && voiceInput.files.length > 0;
        const text = messageInput.value.trim();

        _wasVoiceSending = hasVoice;

        if (!text && !hasVoice) {
            e.preventDefault();
            return;
        }

        if (!hasVoice) {
            e.preventDefault();

            if (window._chatSocket.readyState === WebSocket.OPEN) {
                window._chatSocket.send(
                    JSON.stringify({ message: text })
                );
            }

            messageInput.value = "";
            messageInput.style.height = "auto";
            messageInput.focus();
        }
    });

    const recipientId = parseInt(chatWindow.dataset.userId);
    startStatusPolling(recipientId);
}

function appendMessage(
    user,
    text,
    time,
    attachment = null,
    attachmentType = null,
    currentUser
) {
    const messageContainer = document.getElementById("chat-messages");
    if (!messageContainer) return;

    const emptyState = document.getElementById("empty-chat-state");
    if (emptyState) emptyState.remove();

    const isMyMessage = user === currentUser;

    const msgDiv = document.createElement("div");
    msgDiv.className = `chat-message ${
        isMyMessage ? "my-message" : "other-message"
    }`;

    if (attachment && attachmentType === "audio") {
        msgDiv.innerHTML = `
            <audio controls src="${attachment}"></audio>
            <span class="msg-time">${time}</span>
        `;
    } else if (attachment) {
        msgDiv.innerHTML = `
            <a href="${attachment}" target="_blank">📎 File</a>
            <span class="msg-time">${time}</span>
        `;
    } else {
        msgDiv.innerHTML = `
            <p>${escapeHtml(text)}</p>
            <span class="msg-time">${time}</span>
        `;
    }

    messageContainer.appendChild(msgDiv);
    scrollToBottom(messageContainer);
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom(container) {
    container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
    });
}

function updateSidebarPreview(text) {
    const chatWindow = document.getElementById("chat-window");
    if (!chatWindow) return;

    const username = chatWindow.dataset.username;

    const sidebarLink = document.querySelector(
        `a.chat-link[data-username="${username}"]`
    );

    if (!sidebarLink) return;

    const lastMsgEl = sidebarLink.querySelector(".last-message");
    if (lastMsgEl) {
        lastMsgEl.textContent = text;
        lastMsgEl.classList.remove("muted");
    }

    const badge = sidebarLink.querySelector(".unread-badge");
    if (badge) {
        badge.textContent = "0";
        badge.style.display = "none";
    }
}

function startStatusPolling(userId) {
    if (statusInterval) return;

    statusInterval = setInterval(async () => {
        try {
            const res = await fetch(`/chat/user_status/${userId}/`);
            const data = await res.json();
            updateStatusUI(data.is_online);
        } catch (err) {
            console.error("Status error:", err);
        }
    }, 5000);
}

function updateStatusUI(isOnline) {
    const dot = document.querySelector(".status-dot");
    const text = document.querySelector(".status-text");

    if (!dot || !text) return;

    if (isOnline) {
        dot.classList.add("online");
        text.textContent = "online";
    } else {
        dot.classList.remove("online");
        text.textContent = "offline";
    }
}

function initSidebarSocket() {
    const chatList = document.querySelector(".chat-list");
    if (!chatList) return;

    if (
        window._sidebarSocket &&
        window._sidebarSocket.readyState !== WebSocket.CLOSED
    )
        return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

    window._sidebarSocket = new WebSocket(
        `${protocol}//${window.location.host}/ws/sidebar/`
    );

    window._sidebarSocket.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);

            if (data.type === "sidebar.update") {
                updateSidebarItem(data);
            }

            if (data.type === "user_status") {
                updateUserStatus(data);
            }
        } catch (err) {
            console.error("Sidebar parse error:", err);
        }
    };
}

function updateSidebarItem(data) {
    const chatLink = document.querySelector(
        `a.chat-link[data-username="${data.sender_username}"]`
    );

    if (!chatLink) return;

    const opened =
        document.getElementById("chat-window")?.dataset.username ===
        data.sender_username;

    if (opened) return;

    const lastMsg = chatLink.querySelector(".last-message");

    if (lastMsg) {
        lastMsg.textContent = data.last_message;
        lastMsg.classList.remove("muted");
    }

    const badge = chatLink.querySelector(".unread-badge");

    if (badge) {
        badge.textContent = data.unread_count;
        badge.style.display =
            data.unread_count > 0 ? "inline-block" : "none";
    }
}

function updateUserStatus(data) {
    const chatWindow = document.getElementById("chat-window");
    if (!chatWindow) return;

    const recipientId = parseInt(chatWindow.dataset.userId);

    if (data.user_id !== recipientId) return;

    updateStatusUI(data.status === "online");
}

function startHeartbeat() {
    if (!window._sidebarSocket) return;

    setInterval(() => {
        if (window._sidebarSocket.readyState === WebSocket.OPEN) {
            window._sidebarSocket.send(
                JSON.stringify({ type: "ping" })
            );
        }
    }, 5000);
}

document.addEventListener("DOMContentLoaded", () => {
    initChatWindow();
    initSidebarSocket();
});

document.addEventListener("htmx:afterSwap", (evt) => {
    if (
        evt.detail.target.closest(".chat-window-placeholder") ||
        evt.detail.target.classList.contains("chat-window-placeholder")
    ) {
        initChatWindow();
    }
});

document.body.addEventListener("htmx:afterRequest", () => {
    if (!_wasVoiceSending) return;

    const voiceInput = document.getElementById("voice-input");
    if (voiceInput) voiceInput.value = "";

    _wasVoiceSending = false;
});

window.addEventListener("beforeunload", () => {
    if (statusInterval) {
        clearInterval(statusInterval);
        statusInterval = null;
    }
});

let readTimeout = null;
let lastReadAt = 0;

function scheduleMarkRead() {
    const now = Date.now();

    if (now - lastReadAt < 2000) return;

    if (readTimeout) return;

    readTimeout = setTimeout(() => {
        if (window._chatSocket?.readyState === WebSocket.OPEN) {
            window._chatSocket.send(
                JSON.stringify({ type: "mark_read" })
            );
        }

        lastReadAt = Date.now();
        readTimeout = null;
    }, 600);
}