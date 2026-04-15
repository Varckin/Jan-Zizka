export function initSidebarSocket() {
    if (window._sidebarSocket?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws/sidebar/`);
    window._sidebarSocket = socket;

    socket.onopen = () => console.log('✅ Sidebar WebSocket connected');
    socket.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            if (data.type === 'sidebar.update') {
                updateSidebarItem(data);
            } else if (data.type === 'user_status') {
                updateUserStatus(data);
            }
        } catch (err) {
            console.error('Sidebar message parse error:', err);
        }
    };
    socket.onclose = () => console.log('🔌 Sidebar WebSocket disconnected');
    socket.onerror = (err) => console.error('❌ Sidebar WebSocket error', err);

    setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }));
        }
    }, 5000);
}

function updateSidebarItem(data) {
    const chatType = data.chat_type || 'dialog';
    let selector;
    if (chatType === 'group') {
        selector = `a.chat-link[data-chat-slug="${data.chat_slug}"]`;
    } else {
        selector = `a.chat-link[data-username="${data.sender_username}"]`;
    }

    const chatLink = document.querySelector(selector);
    if (!chatLink) return;

    const lastMsg = chatLink.querySelector('.last-message');
    if (lastMsg) {
        lastMsg.textContent = data.last_message;
        lastMsg.classList.remove('muted');
    }

    const badge = chatLink.querySelector('.unread-badge');
    if (badge) {
        badge.textContent = data.unread_count;
        badge.style.display = data.unread_count > 0 ? 'inline-block' : 'none';
    }
}

function updateUserStatus(data) {
    const chatWindow = document.getElementById('chat-window');
    if (!chatWindow) return;
    const recipientId = parseInt(chatWindow.dataset.userId);
    if (data.user_id !== recipientId) return;

    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    if (!statusDot || !statusText) return;

    const isOnline = data.status === 'online';
    statusDot.classList.toggle('online', isOnline);
    statusText.textContent = isOnline ? 'online' : 'offline';
}