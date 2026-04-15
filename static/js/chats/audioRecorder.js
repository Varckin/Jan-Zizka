let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

export function initAudioRecorder() {
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('#record-btn');
        if (!btn) return;

        const form = document.getElementById('chat-form');
        const textInput = document.getElementById('message-input');
        const voiceInput = document.getElementById('voice-input');
        if (!form || !textInput || !voiceInput) return;

        if (!isRecording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                audioChunks = [];

                mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
                mediaRecorder.onstop = () => {
                    const blob = new Blob(audioChunks, { type: 'audio/webm' });
                    const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    voiceInput.files = dt.files;

                    stream.getTracks().forEach(t => t.stop());
                    form.requestSubmit();
                };

                mediaRecorder.start();
                isRecording = true;
                btn.classList.add('recording');
                btn.textContent = '⏹';
                textInput.disabled = true;
                textInput.placeholder = 'Recording...';
            } catch (err) {
                console.error(err);
                alert('Microphone access denied');
            }
        } else {
            mediaRecorder.stop();
            isRecording = false;
            btn.classList.remove('recording');
            btn.textContent = '🎤';
            textInput.disabled = false;
            textInput.placeholder = 'Type a message...';
        }
    });
}