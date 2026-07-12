// notifications.js - Система уведомлений

function showNotification(message, type = 'info', duration = 4000) {
    let container = document.getElementById('notificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        container.id = 'notificationContainer';
        document.body.appendChild(container);
    }
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const notification = document.createElement('div');
    notification.className = 'notification notification-' + type;
    notification.innerHTML = '<span class="notification-icon">' + (icons[type] || 'ℹ️') + '</span><span>' + message + '</span>';
    container.appendChild(notification);
    requestAnimationFrame(() => notification.classList.add('show'));
    const timeout = setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 400);
    }, duration);
    notification.addEventListener('click', () => {
        clearTimeout(timeout);
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 400);
    });
    return notification;
}

function notifySuccess(message) { return showNotification(message, 'success'); }
function notifyError(message) { return showNotification(message, 'error'); }
function notifyInfo(message) { return showNotification(message, 'info'); }
function notifyWarning(message) { return showNotification(message, 'warning'); }