let statusInterval = null;

export function startStatusPolling(userId) {
    stopStatusPolling();
    statusInterval = setInterval(async () => {
        try {
            const res = await fetch(`/chat/user_status/${userId}/`);
            const data = await res.json();
            updateStatusUI(data.is_online);
        } catch (err) {
            console.error('Status check failed:', err);
        }
    }, 5000);
}

export function stopStatusPolling() {
    if (statusInterval) {
        clearInterval(statusInterval);
        statusInterval = null;
    }
}

function updateStatusUI(isOnline) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    if (!statusDot || !statusText) return;

    statusDot.classList.toggle('online', isOnline);
    statusText.textContent = isOnline ? 'online' : 'offline';
}