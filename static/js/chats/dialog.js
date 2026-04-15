import { initChatWebSocket } from './chatWebSocket.js';
import { startStatusPolling, stopStatusPolling } from './statusPoller.js';
import { attachMessageForm } from './messageSender.js';
import { scrollToBottom } from './utils.js';

export async function loadDialog(username) {
    const container = document.querySelector('.chat-window-placeholder');
    try {
        const response = await fetch(`/chat/${username}/`);
        const html = await response.text();
        container.innerHTML = html;

        const chatWindow = document.getElementById('chat-window');
        if (chatWindow) {
            if (window._chatSocket) {
                window._chatSocket.close();
            }
            stopStatusPolling();

            const currentUser = chatWindow.dataset.currentUser;
            initChatWebSocket(username, currentUser);
            startStatusPolling(parseInt(chatWindow.dataset.userId));
            attachMessageForm();

            const messagesContainer = document.getElementById('chat-messages');
            if (messagesContainer) {
                scrollToBottom(messagesContainer);
            }
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