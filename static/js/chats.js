document.addEventListener("DOMContentLoaded", () => {
    const chatWindow = document.getElementById("chat-window");
    if (!chatWindow) return;

    const recipientUsername = chatWindow.dataset.username;
    const currentUsername = chatWindow.dataset.currentUser;
    const messageContainer = document.getElementById("chat-messages");
    const chatForm = document.getElementById("chat-form");
    const messageInput = document.getElementById("message-input");

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws/chat/${recipientUsername}/`);

    messageInput.addEventListener("input", () => {
        messageInput.style.height = "auto";
        messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + "px";
    });

    socket.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            if (data.type === "chat_message") {
                appendMessage(data.user, data.message, data.time);
            }
        } catch (err) {
            console.error("Failed to parse message:", err);
        }
    };

    socket.onopen = () => console.log("✅ WebSocket connected");
    socket.onclose = () => console.log("🔌 WebSocket disconnected");
    socket.onerror = (err) => console.error("❌ WebSocket error", err);

    chatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = messageInput.value.trim();
        if (!text) return;

        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ message: text }));
        }

        messageInput.value = "";
        messageInput.style.height = "auto";
        messageInput.focus();
    });

    function appendMessage(user, text, time) {
        const emptyState = document.getElementById('empty-chat-state');
        if (emptyState) {
            emptyState.remove();
        }
        
        const isMyMessage = user === currentUsername;
        const msgDiv = document.createElement("div");
        msgDiv.className = `chat-message ${isMyMessage ? "my-message" : "other-message"}`;
        
        msgDiv.innerHTML = `
            <p>${escapeHtml(text)}</p>
            <span class="msg-time">${time}</span>
        `;
        
        messageContainer.appendChild(msgDiv);
        scrollToBottom();
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
});