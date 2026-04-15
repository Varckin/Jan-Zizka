import { initChatWebSocket } from './chatWebSocket.js';
import { startStatusPolling, stopStatusPolling } from './statusPoller.js';
import { attachMessageForm } from './messageSender.js';
import { scrollToBottom } from './utils.js';

export async function loadDialog(identifier) {
    const container = document.querySelector('.chat-window-placeholder');
    try {
        let url;
        if (identifier.startsWith('@')) {
            url = `/chat/${identifier.substring(1)}/`;
        } else {
            url = `/chat/group/${identifier}/`;
        }
        const response = await fetch(url);
        const html = await response.text();
        container.innerHTML = html;

        const chatWindow = document.getElementById('chat-window');
        if (chatWindow) {
            if (window._chatSocket) {
                window._chatSocket.close();
            }
            stopStatusPolling();

            const currentUser = chatWindow.dataset.currentUser;
            const chatSlug = chatWindow.dataset.chatSlug;
            const chatId = chatWindow.dataset.chatId;

            let wsUrl;
            if (chatSlug) {
                wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/chat/group/${chatSlug}/`;
            } else {
                const username = chatWindow.dataset.username;
                wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/chat/${username}/`;
            }

            const socket = new WebSocket(wsUrl);
            window._chatSocket = socket;
            socket.onopen = () => console.log('Chat WebSocket connected');
            socket.onmessage = (e) => {
                const data = JSON.parse(e.data);
                if (data.type === 'chat_message') {
                    appendMessage(data.user, data.message, data.time, data.attachment, data.attachment_type, currentUser);
                    if (socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({ type: 'mark_read' }));
                    }
                }
            };
            socket.onclose = () => console.log('Chat WebSocket disconnected');

            attachMessageForm();
            scrollToBottom(document.getElementById('chat-messages'));
        }
    } catch (err) {
        console.error('Failed to load dialog:', err);
    }
}

export function bindContactLinks() {
    document.querySelectorAll('.chat-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const username = link.dataset.username;
            loadDialog(username);
            history.pushState({}, '', `/chat/${username}/`);
        });
    });

    window.addEventListener('popstate', () => {
        const path = window.location.pathname;
        const match = path.match(/^\/chat\/([^/]+)\/$/);
        if (match) {
            loadDialog(match[1]);
        } else {
            document.querySelector('.chat-window-placeholder').innerHTML = '<p>Select a chat to start messaging</p>';
            if (window._chatSocket) {
                window._chatSocket.close();
            }
            stopStatusPolling();
        }
    });
}