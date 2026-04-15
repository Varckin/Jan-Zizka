(function() {
    'use strict';

    const containerSelector = '#profile-card';

    document.addEventListener('click', function(event) {
        const editBtn = event.target.closest('.js-edit-profile');
        if (editBtn) {
            event.preventDefault();
            const url = editBtn.dataset.editUrl;
            if (url) {
                loadContent(url, 'GET');
            }
            return;
        }

        const cancelBtn = event.target.closest('.js-cancel-edit');
        if (cancelBtn) {
            event.preventDefault();
            const url = cancelBtn.dataset.profileUrl;
            if (url) {
                loadContent(url, 'GET');
            }
            return;
        }
    });

    document.addEventListener('submit', function(event) {
        const form = event.target.closest('.js-profile-edit-form');
        if (!form) return;

        event.preventDefault();

        const url = form.action;
        const method = form.method.toUpperCase();
        const formData = new FormData(form);

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Saving...';
        submitBtn.disabled = true;

        fetch(url, {
            method: method,
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            replaceCardContent(html);
        })
        .catch(error => {
            console.error('Form submission error:', error);
            alert('An error occurred while saving. Please try again.');
        })
        .finally(() => {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        });
    });

    function loadContent(url, method = 'GET') {
        const card = document.querySelector(containerSelector);
        if (!card) return;

        card.classList.add('fade-out');

        fetch(url, {
            method: method,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            setTimeout(() => {
                replaceCardContent(html);
            }, 150);
        })
        .catch(error => {
            console.error('Failed to load content:', error);
            card.classList.remove('fade-out');
            alert('Failed to load content. Please try again.');
        });
    }

    function replaceCardContent(html) {
        const oldCard = document.querySelector(containerSelector);
        if (!oldCard) return;

        const temp = document.createElement('div');
        temp.innerHTML = html.trim();
        const newCard = temp.firstChild;

        if (newCard && newCard.id === 'profile-card') {
            newCard.classList.add('fade-in');

            oldCard.parentNode.replaceChild(newCard, oldCard);

            setTimeout(() => {
                newCard.classList.remove('fade-in');
            }, 300);
        } else {
            console.warn('Expected #profile-card in response, got:', newCard);
            oldCard.innerHTML = temp.innerHTML;
            oldCard.classList.remove('fade-out');
            oldCard.classList.add('fade-in');
            setTimeout(() => {
                oldCard.classList.remove('fade-in');
            }, 300);
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        const card = document.querySelector(containerSelector);
        if (card && !card.classList.contains('fade-in')) {
            card.classList.add('fade-in');
            setTimeout(() => card.classList.remove('fade-in'), 300);
        }
    });
})();