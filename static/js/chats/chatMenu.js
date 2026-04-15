import { loadDialog } from './dialog.js';

export function initChatMenu() {
    const menuBtn = document.getElementById('chat-menu-btn');
    const dropdown = document.getElementById('chat-menu-dropdown');
    const createGroupBtn = document.getElementById('create-group-btn');
    const modal = document.getElementById('create-group-modal');
    const closeModalBtn = modal?.querySelector('.close-modal');
    const cancelBtn = modal?.querySelector('.cancel-btn');
    const form = document.getElementById('create-group-form');
    const addParticipantBtn = document.getElementById('add-participant-btn');
    const participantsContainer = document.getElementById('participants-container');
    const newDialogInput = document.getElementById('new-dialog-input');

    if (menuBtn && dropdown) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', () => {
            dropdown.classList.add('hidden');
        });

        dropdown.addEventListener('click', (e) => e.stopPropagation());
    }

    function openModal() {
        modal?.classList.remove('hidden');
    }

    function closeModal() {
        modal?.classList.add('hidden');
        if (form) {
            form.reset();
            if (participantsContainer) {
                participantsContainer.innerHTML = `
                    <div class="participant-input-row">
                        <input type="text" class="participant-username" placeholder="Enter username">
                        <button type="button" class="remove-participant-btn" disabled>✕</button>
                    </div>
                `;
            }
        }
    }

    if (createGroupBtn) {
        createGroupBtn.addEventListener('click', () => {
            dropdown.classList.add('hidden');
            openModal();
        });
    }

    closeModalBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    function updateRemoveButtons() {
        if (!participantsContainer) return;
        const rows = participantsContainer.querySelectorAll('.participant-input-row');
        rows.forEach((row) => {
            const btn = row.querySelector('.remove-participant-btn');
            if (btn) {
                btn.disabled = rows.length === 1;
            }
        });
    }

    addParticipantBtn?.addEventListener('click', () => {
        if (!participantsContainer) return;
        const row = document.createElement('div');
        row.className = 'participant-input-row';
        row.innerHTML = `
            <input type="text" class="participant-username" placeholder="Enter username">
            <button type="button" class="remove-participant-btn">✕</button>
        `;
        participantsContainer.appendChild(row);
        updateRemoveButtons();
        row.querySelector('input')?.focus();
    });

    participantsContainer?.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-participant-btn')) {
            const row = e.target.closest('.participant-input-row');
            if (row) {
                row.remove();
                updateRemoveButtons();
            }
        }
    });

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('group-name');
        const name = nameInput?.value.trim();
        const usernameInputs = participantsContainer?.querySelectorAll('.participant-username');
        const usernames = Array.from(usernameInputs || [])
            .map(input => input.value.trim())
            .filter(u => u !== '');

        if (!name) {
            alert('Group name is required');
            return;
        }
        if (usernames.length === 0) {
            alert('Add at least one participant');
            return;
        }

        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
        if (!csrfToken) {
            alert('CSRF token not found');
            return;
        }

        try {
            const response = await fetch('/chat/group/create/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({ name, usernames })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to create group');
            }

            window.location.reload();
        } catch (err) {
            alert(err.message);
        }
    });

    newDialogInput?.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const username = newDialogInput.value.trim();
            if (!username) return;

            try {
                const checkRes = await fetch(`/chat/user/check/?username=${encodeURIComponent(username)}`);
                const checkData = await checkRes.json();
                if (!checkRes.ok) {
                    throw new Error(checkData.error || 'User not found');
                }

                newDialogInput.value = '';

                await loadDialog(username);
                history.pushState({}, '', `/chat/${username}/`);
            } catch (err) {
                alert(err.message);
            }
        }
    });
}