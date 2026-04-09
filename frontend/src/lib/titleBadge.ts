const BASE_TITLE = 'qhat';
let unreadCount = 0;

export function incrementUnread() {
  if (document.hidden) {
    unreadCount++;
    document.title = `(${unreadCount}) ${BASE_TITLE}`;
  }
}

export function clearUnread() {
  unreadCount = 0;
  document.title = BASE_TITLE;
}

// Auto-clear when tab becomes visible
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && unreadCount > 0) {
      clearUnread();
    }
  });
}
