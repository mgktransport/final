// Notification Service - Handles push, sound, and email notifications
'use client';

// Check if we're in the browser
const isBrowser = typeof window !== 'undefined';

// Notification settings type
interface NotificationSettings {
  pushNotifications: boolean;
  soundEnabled: boolean;
  emailNotifications: boolean;
  emailRecipient: string;
}

// Default settings
const DEFAULT_SETTINGS: NotificationSettings = {
  pushNotifications: true,
  soundEnabled: true,
  emailNotifications: false,
  emailRecipient: '',
};

// Cache settings in memory
let cachedSettings: NotificationSettings | null = null;
let settingsPromise: Promise<NotificationSettings> | null = null;

// Get notification settings from API
export async function getNotificationSettingsClient(): Promise<NotificationSettings> {
  if (cachedSettings) return cachedSettings;
  if (settingsPromise) return settingsPromise;
  
  settingsPromise = (async () => {
    try {
      const response = await fetch('/api/parametres');
      const data = await response.json();
      
      if (data && Array.isArray(data)) {
        const settings = { ...DEFAULT_SETTINGS };
        
        for (const param of data) {
          switch (param.cle) {
            case 'NOTIF_PUSH_ENABLED':
              settings.pushNotifications = param.valeur === 'true';
              break;
            case 'NOTIF_SOUND_ENABLED':
              settings.soundEnabled = param.valeur === 'true';
              break;
            case 'NOTIF_EMAIL_ENABLED':
              settings.emailNotifications = param.valeur === 'true';
              break;
            case 'NOTIF_EMAIL_RECIPIENT':
              settings.emailRecipient = param.valeur;
              break;
          }
        }
        
        cachedSettings = settings;
        return settings;
      }
      
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error loading notification settings:', error);
      return DEFAULT_SETTINGS;
    } finally {
      settingsPromise = null;
    }
  })();
  
  return settingsPromise;
}

// Clear settings cache (call when settings are updated)
export function clearSettingsCache(): void {
  cachedSettings = null;
}

// Request browser notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isBrowser || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// Show browser push notification
export async function showPushNotification(title: string, body: string, options?: NotificationOptions): Promise<boolean> {
  if (!isBrowser) return false;

  const settings = await getNotificationSettingsClient();
  
  if (!settings.pushNotifications) {
    return false;
  }

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    console.log('Push notifications not permitted');
    return false;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: '/logo-mgk.png',
      badge: '/logo-mgk.png',
      tag: 'mgk-alert',
      ...options,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return true;
  } catch (error) {
    console.error('Error showing push notification:', error);
    return false;
  }
}

// Play notification sound
export async function playNotificationSound(): Promise<boolean> {
  if (!isBrowser) return false;

  const settings = await getNotificationSettingsClient();
  
  if (!settings.soundEnabled) {
    return false;
  }

  try {
    // Create audio context for notification sound
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    
    // Create a simple beep sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800; // Frequency in Hz
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
    
    return true;
  } catch (error) {
    console.error('Error playing notification sound:', error);
    return false;
  }
}

// Send email notification (server-side would be needed for real implementation)
export async function sendEmailNotification(subject: string, message: string): Promise<boolean> {
  const settings = await getNotificationSettingsClient();
  
  if (!settings.emailNotifications || !settings.emailRecipient) {
    return false;
  }

  // This would require a server-side email service
  // For now, we'll just log it
  console.log('Email notification would be sent:', {
    to: settings.emailRecipient,
    subject,
    message,
  });

  // TODO: Implement server-side email sending
  // You could use an API route like /api/send-email
  
  return true;
}

// Main notification function - triggers all enabled notification types
export async function notify(options: {
  title: string;
  message: string;
  type: 'document' | 'facture' | 'entretien';
  priority: 'HAUTE' | 'MOYENNE' | 'BASSE';
}): Promise<void> {
  // Get settings
  const settings = await getNotificationSettingsClient();

  // Only notify for high priority by default
  const shouldNotifyImmediately = options.priority === 'HAUTE';

  if (shouldNotifyImmediately) {
    // Show push notification
    if (settings.pushNotifications) {
      await showPushNotification(options.title, options.message);
    }

    // Play sound
    if (settings.soundEnabled) {
      await playNotificationSound();
    }
  }

  // Email for all new alerts if enabled
  if (settings.emailNotifications && settings.emailRecipient) {
    await sendEmailNotification(options.title, options.message);
  }
}

// Toast notification helper (for in-app notifications)
export function showToastNotification(
  title: string,
  message: string,
  type: 'success' | 'warning' | 'error' | 'info' = 'info'
): void {
  // This will be used with the toast system already in place
  // The actual toast is handled by the components
  console.log('Toast notification:', { title, message, type });
}
