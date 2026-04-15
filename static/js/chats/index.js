import { initSidebarSocket } from './sidebar.js';
import { bindContactLinks } from './dialog.js';
import { initAudioRecorder } from './audioRecorder.js';
import { initChatMenu } from './chatMenu.js';

document.addEventListener('DOMContentLoaded', () => {
    initSidebarSocket();
    bindContactLinks();
    initAudioRecorder();
    initChatMenu();

    const path = window.location.pathname;
    const matchDialog = path.match(/^\/chat\/([^/]+)\/$/);
    const matchGroup = path.match(/^\/chat\/group\/([^/]+)\/$/);
    
    if (matchDialog) {
        loadDialog(`@${matchDialog[1]}`);
    } else if (matchGroup) {
        loadDialog(matchGroup[1]);
    }
});