import { escapeHtml, scrollToBottom } from './utils.js';

export function initChatWebSocket(recipientUsername, currentUsername) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws/chat/${recipientUsername}/`);
    window._chatSocket = socket;

    socket.onopen = () => console.log('✅ Chat WebSocket connected');
    socket.onclose = () => console.log('🔌 Chat WebSocket disconnected');
    socket.onerror = (err) => console.error('❌ Chat WebSocket error', err);

    socket.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            if (data.type === 'chat_message') {
                appendMessage(data.user, data.message, data.time, data.attachment, data.attachment_type, currentUsername);
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: 'mark_read' }));
                }
            }
        } catch (err) {
            console.error('Failed to parse chat message:', err);
        }
    };
}

function appendMessage(user, text, time, attachment, attachmentType, currentUsername) {
    const container = document.getElementById('chat-messages');
    const emptyState = document.getElementById('empty-chat-state');
    if (emptyState) emptyState.remove();

    const isMyMessage = user === currentUsername;
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${isMyMessage ? 'my-message' : 'other-message'}`;

    let inner = '';
    if (attachment && attachmentType === 'audio') {
        inner = `<audio controls src="${attachment}"></audio>`;
    } else if (attachment) {
        inner = `<a href="${attachment}" target="_blank">📎 File</a>`;
    } else {
        inner = `<p>${escapeHtml(text)}</p>`;
    }
    inner += `<span class="msg-time">${time}</span>`;
    msgDiv.innerHTML = inner;

    container.appendChild(msgDiv);
    scrollToBottom(container);
}