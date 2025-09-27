const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

// Alert schema
const alertSchema = new mongoose.Schema({
  type: String, // critical, warning, info
  message: String,
  value: Number,
  threshold: String,
  device_id: String,
  status: { type: String, default: 'pending' }, // pending, sent, failed
  sent_at: Date,
  created_at: { type: Date, default: Date.now }
});

// Only create model if mongoose is connected
let Alert = null;
if (mongoose.connection.readyState === 1) {
  Alert = mongoose.model('Alert', alertSchema);
}

class NotificationService {
  constructor() {
    this.emailTransporter = null;
    this.setupEmailTransporter();
    this.alertHistory = [];
  }

  setupEmailTransporter() {
    // Email configuration (in production, use environment variables)
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'your-email@gmail.com',
        pass: process.env.SMTP_PASS || 'your-app-password'
      }
    });
  }

  async sendAlerts(alerts, sensorData) {
    const results = [];
    
    for (const alert of alerts) {
      try {
        const result = await this.sendAlert(alert);
        results.push(result);
      } catch (error) {
        console.error('Error sending alert:', error);
        results.push({ success: false, error: error.message });
      }
    }
    
    return results;
  }

  async sendAlert(alertData) {
    try {
      console.log(`🚨 Sending alert: ${alertData.type} - ${alertData.message}`);
      
      // Create alert record (if database is available)
      let alert = null;
      if (Alert) {
        alert = new Alert({
          type: alertData.type,
          message: alertData.message,
          value: alertData.value,
          threshold: alertData.threshold,
          device_id: alertData.device_id
        });
        await alert.save();
      }

      // Send email notification
      if (this.shouldSendEmail(alertData.type)) {
        await this.sendEmailNotification(alertData);
      }

      // Send SMS notification for critical alerts
      if (alertData.type === 'critical') {
        await this.sendSMSNotification(alertData);
      }

      // Send webhook notification
      await this.sendWebhookNotification(alertData);

      // Update alert status (if database is available)
      if (alert) {
        alert.status = 'sent';
        alert.sent_at = new Date();
        await alert.save();
      }

      this.alertHistory.push(alertData);

      return {
        success: true,
        message: 'Alert sent successfully',
        alert_id: alert._id
      };

    } catch (error) {
      console.error('Error sending alert:', error);
      
      // Update alert status to failed (if database is available)
      if (alert) {
        alert.status = 'failed';
        await alert.save();
      }

      throw error;
    }
  }

  shouldSendEmail(alertType) {
    // Send email for critical and high priority alerts
    return ['critical', 'high'].includes(alertType);
  }

  async sendEmailNotification(alertData) {
    try {
      const mailOptions = {
        from: process.env.SMTP_USER || 'smart-agriculture@example.com',
        to: process.env.ALERT_EMAIL || 'admin@example.com',
        subject: `🚨 Smart Agriculture Alert - ${alertData.type.toUpperCase()}`,
        html: this.generateEmailTemplate(alertData)
      };

      await this.emailTransporter.sendMail(mailOptions);
      console.log('📧 Email notification sent');
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  generateEmailTemplate(alertData) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${alertData.type === 'critical' ? '#d32f2f' : '#f57c00'};">
          🚨 Smart Agriculture Alert
        </h2>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Alert Details</h3>
          <p><strong>Type:</strong> ${alertData.type.toUpperCase()}</p>
          <p><strong>Message:</strong> ${alertData.message}</p>
          <p><strong>Device ID:</strong> ${alertData.device_id}</p>
          <p><strong>Value:</strong> ${alertData.value}</p>
          <p><strong>Threshold:</strong> ${alertData.threshold}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4>Recommended Actions:</h4>
          <ul>
            ${this.getRecommendedActions(alertData)}
          </ul>
        </div>
        
        <p style="color: #666; font-size: 12px;">
          This is an automated alert from the Smart Agriculture IoT System.
        </p>
      </div>
    `;
  }

  getRecommendedActions(alertData) {
    const actions = [];
    
    if (alertData.message.includes('soil moisture')) {
      actions.push('<li>Check irrigation system</li>');
      actions.push('<li>Verify soil moisture sensor</li>');
    }
    
    if (alertData.message.includes('temperature')) {
      actions.push('<li>Check greenhouse ventilation</li>');
      actions.push('<li>Verify temperature sensor</li>');
    }
    
    if (alertData.message.includes('humidity')) {
      actions.push('<li>Check humidity control system</li>');
      actions.push('<li>Verify humidity sensor</li>');
    }
    
    if (alertData.message.includes('light')) {
      actions.push('<li>Check lighting system</li>');
      actions.push('<li>Verify light sensor</li>');
    }
    
    if (actions.length === 0) {
      actions.push('<li>Check system status</li>');
      actions.push('<li>Verify sensor readings</li>');
    }
    
    return actions.join('');
  }

  async sendSMSNotification(alertData) {
    try {
      // In a real implementation, integrate with SMS service like Twilio
      console.log(`📱 SMS notification: ${alertData.message}`);
      
      // Simulate SMS sending
      const smsData = {
        to: process.env.ALERT_PHONE || '+1234567890',
        message: `🚨 Smart Agriculture Alert: ${alertData.message} (Device: ${alertData.device_id})`,
        timestamp: new Date().toISOString()
      };
      
      console.log('📱 SMS would be sent:', smsData);
      
    } catch (error) {
      console.error('Error sending SMS:', error);
      // Don't throw error for SMS failures
    }
  }

  async sendWebhookNotification(alertData) {
    try {
      const webhookUrl = process.env.WEBHOOK_URL;
      if (!webhookUrl) {
        console.log('No webhook URL configured');
        return;
      }

      const webhookData = {
        type: 'alert',
        alert: alertData,
        timestamp: new Date().toISOString(),
        system: 'smart-agriculture'
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WEBHOOK_TOKEN || 'default-token'}`
        },
        body: JSON.stringify(webhookData)
      });

      if (response.ok) {
        console.log('🔗 Webhook notification sent');
      } else {
        console.error('Webhook notification failed:', response.status);
      }

    } catch (error) {
      console.error('Error sending webhook:', error);
      // Don't throw error for webhook failures
    }
  }

  async getRecentAlerts(hours = 24) {
    try {
      if (!Alert) {
        // Return in-memory alerts if no database
        const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
        return this.alertHistory.filter(alert => 
          new Date(alert.timestamp || Date.now()) >= cutoffTime
        ).slice(0, 50);
      }
      
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      return await Alert.find({
        created_at: { $gte: cutoffTime }
      }).sort({ created_at: -1 }).limit(50);
    } catch (error) {
      console.error('Error fetching recent alerts:', error);
      return [];
    }
  }

  async getAlertStats(days = 7) {
    try {
      if (!Alert) {
        // Return in-memory stats if no database
        const cutoffTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const recentAlerts = this.alertHistory.filter(alert => 
          new Date(alert.timestamp || Date.now()) >= cutoffTime
        );
        
        const stats = {};
        recentAlerts.forEach(alert => {
          if (!stats[alert.type]) {
            stats[alert.type] = { count: 0, sent: 0, failed: 0 };
          }
          stats[alert.type].count++;
          // Assume all in-memory alerts are sent
          stats[alert.type].sent++;
        });
        
        return Object.entries(stats).map(([type, data]) => ({
          _id: type,
          ...data
        }));
      }
      
      const cutoffTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const stats = await Alert.aggregate([
        {
          $match: {
            created_at: { $gte: cutoffTime }
          }
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            sent: {
              $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
            },
            failed: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
            }
          }
        }
      ]);

      return stats;
    } catch (error) {
      console.error('Error fetching alert stats:', error);
      return [];
    }
  }

  // Test notification system
  async testNotification() {
    const testAlert = {
      type: 'info',
      message: 'Test notification from Smart Agriculture System',
      value: 0,
      threshold: 'test',
      device_id: 'test_device'
    };

    return await this.sendAlert(testAlert);
  }
}

module.exports = NotificationService;
