import webpush from 'web-push';

class PushNotificationService {
  constructor() {
    this.subscriptions = new Map();
    this.vapidKeys = this.generateVapidKeys();
    this.disabled = false;
    this.initialize();
  }

  initialize() {
    try {
      // Generate VAPID keys for push notifications
      webpush.setVapidDetails(
        'mailto:admin@slam25.de',
        this.vapidKeys.publicKey,
        this.vapidKeys.privateKey
      );
    } catch (error) {
      console.warn('Push notifications disabled due to invalid VAPID keys:', error.message);
      this.disabled = true;
    }
  }

  generateVapidKeys() {
    // In production, these should be stored in environment variables
    const publicKey = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa1lQJ8S9FfuB4kKCLp7EHDZGT_Sy0jHZHjqy7tXyGL2jbLlIu9W5oWUaRlU';
    const privateKey = process.env.VAPID_PRIVATE_KEY || 'Vk5OeI3F5i1VuYgG5j_U9kqXZyJ8vR69yViEuiBIa1lQJ8S9FfuB4kKCLp7EHDZGT_Sy0jHZHjqy7tXyGL2jbLlIu9W5oWUaRlU';
    
    return { publicKey, privateKey };
  }

  // Get VAPID public key for client
  getVapidPublicKey() {
    if (this.disabled) {
      return null;
    }
    return this.vapidKeys.publicKey;
  }

  // Add subscription
  addSubscription(userId, subscription) {
    this.subscriptions.set(userId, subscription);
    console.log(`Subscription added for user ${userId}`);
  }

  // Remove subscription
  removeSubscription(userId) {
    this.subscriptions.delete(userId);
    console.log(`Subscription removed for user ${userId}`);
  }

  // Send notification to specific user
  async sendNotificationToUser(userId, notification) {
    if (this.disabled) {
      console.log('Push notifications are disabled');
      return false;
    }
    
    const subscription = this.subscriptions.get(userId);
    if (!subscription) {
      console.log(`No subscription found for user ${userId}`);
      return false;
    }

    try {
      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icons/icon-192.svg',
        badge: notification.badge || '/icons/icon-192.svg',
        data: notification.data || {},
        actions: notification.actions || [
          {
            action: 'explore',
            title: 'Öffnen',
            icon: '/icons/icon-192.svg'
          },
          {
            action: 'close',
            title: 'Schließen',
            icon: '/icons/icon-192.svg'
          }
        ]
      });

      await webpush.sendNotification(subscription, payload);
      console.log(`Notification sent to user ${userId}`);
      return true;
    } catch (error) {
      console.error(`Error sending notification to user ${userId}:`, error);
      
      // Remove invalid subscription
      if (error.statusCode === 410) {
        this.removeSubscription(userId);
      }
      
      return false;
    }
  }

  // Send notification to all users
  async sendNotificationToAll(notification) {
    const results = [];
    
    for (const [userId, subscription] of this.subscriptions) {
      const success = await this.sendNotificationToUser(userId, notification);
      results.push({ userId, success });
    }
    
    return results;
  }

  // Send notification to multiple users
  async sendNotificationToUsers(userIds, notification) {
    const results = [];
    
    for (const userId of userIds) {
      const success = await this.sendNotificationToUser(userId, notification);
      results.push({ userId, success });
    }
    
    return results;
  }

  // Predefined notification types
  async sendRoundUpdateNotification(roundTitle, action = 'updated') {
    const notification = {
      title: 'SLAM25 Runde aktualisiert',
      body: `Die Runde "${roundTitle}" wurde ${action}.`,
      data: {
        type: 'round_update',
        roundTitle,
        action
      }
    };

    return this.sendNotificationToAll(notification);
  }

  async sendNewParticipantNotification(participantName) {
    const notification = {
      title: 'Neuer Teilnehmer',
      body: `${participantName} ist dem Poetry Slam beigetreten!`,
      data: {
        type: 'new_participant',
        participantName
      }
    };

    return this.sendNotificationToAll(notification);
  }

  async sendNewsNotification(newsTitle) {
    const notification = {
      title: 'Neue Nachricht',
      body: `Neue Nachricht: ${newsTitle}`,
      data: {
        type: 'news',
        newsTitle
      }
    };

    return this.sendNotificationToAll(notification);
  }

  async sendReminderNotification(eventTitle, eventTime) {
    const notification = {
      title: 'Erinnerung',
      body: `${eventTitle} beginnt in 30 Minuten`,
      data: {
        type: 'reminder',
        eventTitle,
        eventTime
      }
    };

    return this.sendNotificationToAll(notification);
  }

  // Get subscription statistics
  getSubscriptionStats() {
    return {
      totalSubscriptions: this.subscriptions.size,
      activeUsers: Array.from(this.subscriptions.keys())
    };
  }

  // Validate subscription
  validateSubscription(subscription) {
    try {
      // Basic validation
      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return false;
      }

      if (!subscription.keys.p256dh || !subscription.keys.auth) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating subscription:', error);
      return false;
    }
  }
}

// Create singleton instance
const pushNotificationService = new PushNotificationService();

export default pushNotificationService;
