let permissionGranted = false;

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') {
    permissionGranted = true;
    return true;
  }
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  permissionGranted = result === 'granted';
  return permissionGranted;
}

export function showCallNotification(callerName: string): Notification | null {
  if (!permissionGranted || !document.hidden) return null;

  try {
    const notification = new Notification('qhat - Incoming call', {
      body: `${callerName} wants to video chat with you`,
      icon: '/favicon.svg',
      tag: 'incoming-call',
      requireInteraction: true,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  } catch {
    return null;
  }
}

export function showMessageNotification(senderName: string, text: string): Notification | null {
  if (!permissionGranted || !document.hidden) return null;

  try {
    const notification = new Notification(`qhat - ${senderName}`, {
      body: text.length > 100 ? text.slice(0, 100) + '...' : text,
      icon: '/favicon.svg',
      tag: 'chat-message',
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto-close after 5s
    setTimeout(() => notification.close(), 5000);

    return notification;
  } catch {
    return null;
  }
}
