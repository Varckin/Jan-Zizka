import { initChatWebSocket } from './chatWebSocket.js';
import { startStatusPolling, stopStatusPolling } from './statusPoller.js';
import { attachMessageForm } from './messageSender.js';
import { scrollToBottom, escapeHtml } from './utils.js';

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

function closeChat() {
    const messengerContainer = document.querySelector('.messenger-container');
    if (messengerContainer) {
        messengerContainer.classList.remove('chat-active');
    }
    const placeholder = document.querySelector('.chat-window-placeholder');
    if (placeholder) {
        placeholder.innerHTML = '<p>Select a chat to start messaging</p>';
    }
    if (window._chatSocket) {
        window._chatSocket.close();
        window._chatSocket = null;
    }
    stopStatusPolling();
}

export async function loadDialog(identifier) {
    const container = document.querySelector('.chat-window-placeholder');
    const messengerContainer = document.querySelector('.messenger-container');
    
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

        if (messengerContainer) {
            messengerContainer.classList.add('chat-active');
        }

        const chatWindow = document.getElementById('chat-window');
        if (chatWindow) {
            if (window._chatSocket) {
                window._chatSocket.close();
            }
            stopStatusPolling();

            const currentUser = chatWindow.dataset.currentUser;
            const chatSlug = chatWindow.dataset.chatSlug;
            
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

            const backLink = chatWindow.querySelector('.back-link');
            if (backLink) {
                backLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    closeChat();
                    history.pushState({}, '', '/chat/');
                });
            }

            attachMessageForm();
            const messagesContainer = document.getElementById('chat-messages');
            if (messagesContainer) {
                scrollToBottom(messagesContainer);
            }

            if (!chatSlug) {
                const userId = chatWindow.dataset.userId;
                if (userId) {
                    startStatusPolling(parseInt(userId));
                }
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
            const chatSlug = link.dataset.chatSlug;
            const identifier = username ? `@${username}` : chatSlug;
            loadDialog(identifier);
            const url = username ? `/chat/${username}/` : `/chat/group/${chatSlug}/`;
            history.pushState({}, '', url);
        });
    });

    window.addEventListener('popstate', () => {
        const path = window.location.pathname;
        const matchDialog = path.match(/^\/chat\/([^/]+)\/$/);
        const matchGroup = path.match(/^\/chat\/group\/([^/]+)\/$/);
        
        if (matchDialog) {
            loadDialog(`@${matchDialog[1]}`);
        } else if (matchGroup) {
            loadDialog(matchGroup[1]);
        } else {
            closeChat();
        }
    });
}