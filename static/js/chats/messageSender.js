export function attachMessageForm() {
    const form = document.getElementById('chat-form');
    if (!form || form.dataset.listener) return;
    form.dataset.listener = 'true';

    const textInput = document.getElementById('message-input');
    const voiceInput = document.getElementById('voice-input');

    textInput.addEventListener('input', () => {
        textInput.style.height = 'auto';
        textInput.style.height = Math.min(textInput.scrollHeight, 120) + 'px';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = textInput.value.trim();
        const hasAttachment = voiceInput.files.length > 0;

        if (!text && !hasAttachment) return;

        if (!hasAttachment && window._chatSocket?.readyState === WebSocket.OPEN) {
            window._chatSocket.send(JSON.stringify({ message: text }));
            textInput.value = '';
            textInput.style.height = 'auto';
            return;
        }

        const formData = new FormData(form);
        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                console.error('Send failed');
                return;
            }

            textInput.value = '';
            textInput.style.height = 'auto';
            voiceInput.value = '';
        } catch (err) {
            console.error('Send failed:', err);
        }
    });
}