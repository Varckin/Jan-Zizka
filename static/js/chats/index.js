import { initSidebarSocket } from './sidebar.js';
import { bindContactLinks } from './dialog.js';
import { initAudioRecorder } from './audioRecorder.js';

document.addEventListener('DOMContentLoaded', () => {
    initSidebarSocket();
    bindContactLinks();
    initAudioRecorder();
});