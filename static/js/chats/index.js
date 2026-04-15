import { initSidebarSocket } from './sidebar.js';
import { bindContactLinks } from './dialog.js';
import { initAudioRecorder } from './audioRecorder.js';
import { initChatMenu } from './chatMenu.js';

document.addEventListener('DOMContentLoaded', () => {
    initSidebarSocket();
    bindContactLinks();
    initAudioRecorder();
    initChatMenu();
});