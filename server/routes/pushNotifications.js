import express from 'express';
import pushNotificationService from '../services/pushNotificationService.js';

const router = express.Router();

// Get VAPID public key
router.get('/vapid-public-key', (req, res) => {
  try {
    const publicKey = pushNotificationService.getVapidPublicKey();
    res.json({ publicKey });
  } catch (error) {
    console.error('Error getting VAPID public key:', error);
    res.status(500).json({ error: 'Failed to get VAPID public key' });
  }
});

// Subscribe to push notifications
router.post('/subscribe', (req, res) => {
  try {
    const { userId, subscription } = req.body;

    if (!userId || !subscription) {
      return res.status(400).json({ error: 'User ID and subscription are required' });
    }

    if (!pushNotificationService.validateSubscription(subscription)) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }

    pushNotificationService.addSubscription(userId, subscription);
    res.json({ success: true, message: 'Subscription added successfully' });
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    res.status(500).json({ error: 'Failed to subscribe to push notifications' });
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    pushNotificationService.removeSubscription(userId);
    res.json({ success: true, message: 'Subscription removed successfully' });
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    res.status(500).json({ error: 'Failed to unsubscribe from push notifications' });
  }
});

// Send notification to specific user
router.post('/send-to-user', (req, res) => {
  try {
    const { userId, notification } = req.body;

    if (!userId || !notification) {
      return res.status(400).json({ error: 'User ID and notification are required' });
    }

    if (!notification.title || !notification.body) {
      return res.status(400).json({ error: 'Notification title and body are required' });
    }

    pushNotificationService.sendNotificationToUser(userId, notification)
      .then(success => {
        if (success) {
          res.json({ success: true, message: 'Notification sent successfully' });
        } else {
          res.status(404).json({ error: 'User not found or notification failed' });
        }
      })
      .catch(error => {
        console.error('Error sending notification:', error);
        res.status(500).json({ error: 'Failed to send notification' });
      });
  } catch (error) {
    console.error('Error in send-to-user route:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Send notification to all users
router.post('/send-to-all', (req, res) => {
  try {
    const { notification } = req.body;

    if (!notification) {
      return res.status(400).json({ error: 'Notification is required' });
    }

    if (!notification.title || !notification.body) {
      return res.status(400).json({ error: 'Notification title and body are required' });
    }

    pushNotificationService.sendNotificationToAll(notification)
      .then(results => {
        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;
        
        res.json({ 
          success: true, 
          message: `Notification sent to ${successCount}/${totalCount} users`,
          results 
        });
      })
      .catch(error => {
        console.error('Error sending notification to all:', error);
        res.status(500).json({ error: 'Failed to send notification to all users' });
      });
  } catch (error) {
    console.error('Error in send-to-all route:', error);
    res.status(500).json({ error: 'Failed to send notification to all users' });
  }
});

// Send notification to multiple users
router.post('/send-to-users', (req, res) => {
  try {
    const { userIds, notification } = req.body;

    if (!userIds || !Array.isArray(userIds) || !notification) {
      return res.status(400).json({ error: 'User IDs array and notification are required' });
    }

    if (!notification.title || !notification.body) {
      return res.status(400).json({ error: 'Notification title and body are required' });
    }

    pushNotificationService.sendNotificationToUsers(userIds, notification)
      .then(results => {
        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;
        
        res.json({ 
          success: true, 
          message: `Notification sent to ${successCount}/${totalCount} users`,
          results 
        });
      })
      .catch(error => {
        console.error('Error sending notification to users:', error);
        res.status(500).json({ error: 'Failed to send notification to users' });
      });
  } catch (error) {
    console.error('Error in send-to-users route:', error);
    res.status(500).json({ error: 'Failed to send notification to users' });
  }
});

// Predefined notification types
router.post('/send-round-update', (req, res) => {
  try {
    const { roundTitle, action = 'updated' } = req.body;

    if (!roundTitle) {
      return res.status(400).json({ error: 'Round title is required' });
    }

    pushNotificationService.sendRoundUpdateNotification(roundTitle, action)
      .then(results => {
        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;
        
        res.json({ 
          success: true, 
          message: `Round update notification sent to ${successCount}/${totalCount} users`,
          results 
        });
      })
      .catch(error => {
        console.error('Error sending round update notification:', error);
        res.status(500).json({ error: 'Failed to send round update notification' });
      });
  } catch (error) {
    console.error('Error in send-round-update route:', error);
    res.status(500).json({ error: 'Failed to send round update notification' });
  }
});

router.post('/send-new-participant', (req, res) => {
  try {
    const { participantName } = req.body;

    if (!participantName) {
      return res.status(400).json({ error: 'Participant name is required' });
    }

    pushNotificationService.sendNewParticipantNotification(participantName)
      .then(results => {
        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;
        
        res.json({ 
          success: true, 
          message: `New participant notification sent to ${successCount}/${totalCount} users`,
          results 
        });
      })
      .catch(error => {
        console.error('Error sending new participant notification:', error);
        res.status(500).json({ error: 'Failed to send new participant notification' });
      });
  } catch (error) {
    console.error('Error in send-new-participant route:', error);
    res.status(500).json({ error: 'Failed to send new participant notification' });
  }
});

router.post('/send-news', (req, res) => {
  try {
    const { newsTitle } = req.body;

    if (!newsTitle) {
      return res.status(400).json({ error: 'News title is required' });
    }

    pushNotificationService.sendNewsNotification(newsTitle)
      .then(results => {
        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;
        
        res.json({ 
          success: true, 
          message: `News notification sent to ${successCount}/${totalCount} users`,
          results 
        });
      })
      .catch(error => {
        console.error('Error sending news notification:', error);
        res.status(500).json({ error: 'Failed to send news notification' });
      });
  } catch (error) {
    console.error('Error in send-news route:', error);
    res.status(500).json({ error: 'Failed to send news notification' });
  }
});

router.post('/send-reminder', (req, res) => {
  try {
    const { eventTitle, eventTime } = req.body;

    if (!eventTitle || !eventTime) {
      return res.status(400).json({ error: 'Event title and time are required' });
    }

    pushNotificationService.sendReminderNotification(eventTitle, eventTime)
      .then(results => {
        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;
        
        res.json({ 
          success: true, 
          message: `Reminder notification sent to ${successCount}/${totalCount} users`,
          results 
        });
      })
      .catch(error => {
        console.error('Error sending reminder notification:', error);
        res.status(500).json({ error: 'Failed to send reminder notification' });
      });
  } catch (error) {
    console.error('Error in send-reminder route:', error);
    res.status(500).json({ error: 'Failed to send reminder notification' });
  }
});

// Get subscription statistics
router.get('/stats', (req, res) => {
  try {
    const stats = pushNotificationService.getSubscriptionStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting subscription stats:', error);
    res.status(500).json({ error: 'Failed to get subscription statistics' });
  }
});

export default router;













