const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const mqtt = require('mqtt');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const DecisionEngine = require('./decision-engine');
const IrrigationController = require('./irrigation-controller');
const NotificationService = require('./notification-service');

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const connectToMongoDB = async () => {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!process.env.MONGODB_URI) {
    console.warn('⚠️ No MONGODB_URI environment variable found, using local MongoDB');
  }
  
  await mongoose.connect(mongoUri);
  console.log('✅ Decision Engine connected to MongoDB:');
};

// MongoDB connection will be handled in startServer()

// MQTT client
let mqttClient = null;
const connectMQTT = () => {
  mqttClient = mqtt.connect('mqtt://test.mosquitto.org:1883', {
    clientId: `decision_engine_${Date.now()}`,
    clean: true,
    reconnectPeriod: 1000
  });

  mqttClient.on('connect', () => {
    console.log('✅ Decision Engine connected to MQTT broker');
    mqttClient.subscribe('sensors/data');
    mqttClient.subscribe('actuators/status');
  });

  mqttClient.on('message', async (topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (topic === 'sensors/data') {
        await processSensorData(data);
      } else if (topic === 'actuators/status') {
        await processActuatorStatus(data);
      }
    } catch (error) {
      console.error('Error processing MQTT message:', error);
    }
  });

  mqttClient.on('error', (error) => {
    console.error('❌ MQTT connection error:', error);
  });
};

// Initialize services
const decisionEngine = new DecisionEngine();
const irrigationController = new IrrigationController();
const notificationService = new NotificationService();

// Process sensor data and make decisions
async function processSensorData(sensorData) {
  try {
    console.log('📊 Processing sensor data:', sensorData);
    
    // Make decisions based on sensor data
    const decisions = await decisionEngine.analyzeData(sensorData);
    
    if (decisions.length > 0) {
      console.log('🎯 Decisions made:', decisions);
      
      // Execute decisions
      for (const decision of decisions) {
        await executeDecision(decision, sensorData);
      }
      
      // Store decision log
      await decisionEngine.logDecision({
        sensor_data: sensorData,
        decisions: decisions,
        timestamp: new Date()
      });
    }
    
    // Check for alerts
    const alerts = decisionEngine.checkAlerts(sensorData);
    if (alerts.length > 0) {
      await notificationService.sendAlerts(alerts, sensorData);
    }
    
  } catch (error) {
    console.error('Error processing sensor data:', error);
  }
}

// Execute a decision
async function executeDecision(decision, sensorData) {
  try {
    switch (decision.action) {
      case 'irrigate':
        await irrigationController.startIrrigation({
          duration: decision.duration,
          device_id: sensorData.device_id,
          reason: decision.reason
        });
        break;
        
      case 'fertilize':
        await irrigationController.dispenseFertilizer({
          amount: decision.amount,
          device_id: sensorData.device_id,
          reason: decision.reason
        });
        break;
        
      case 'alert':
        await notificationService.sendAlert({
          type: decision.priority,
          message: decision.message,
          device_id: sensorData.device_id,
          reason: decision.reason
        });
        break;
    }
  } catch (error) {
    console.error('Error executing decision:', error);
  }
}

// Process actuator status updates
async function processActuatorStatus(statusData) {
  try {
    console.log('🔧 Actuator status update:', statusData);
    
    // Update irrigation controller status
    if (statusData.type === 'irrigation') {
      await irrigationController.updateStatus(statusData);
    }
    
  } catch (error) {
    console.error('Error processing actuator status:', error);
  }
}

// API Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'decision-engine',
    mqttConnected: mqttClient ? mqttClient.connected : false,
    mongodbConnected: mongoose.connection.readyState === 1,
    mongodbState: mongoose.connection.readyState
  });
});

app.get('/api/decisions/recent', async (req, res) => {
  try {
    const decisions = await decisionEngine.getRecentDecisions(24); // Last 24 hours
    res.json(decisions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recent decisions' });
  }
});

app.get('/api/irrigation/status', async (req, res) => {
  try {
    const status = await irrigationController.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch irrigation status' });
  }
});

app.post('/api/irrigation/manual', async (req, res) => {
  try {
    const { duration, device_id } = req.body;
    await irrigationController.startIrrigation({
      duration: duration || 300,
      device_id: device_id || 'manual_control',
      reason: 'Manual irrigation request'
    });
    res.json({ message: 'Manual irrigation started' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start manual irrigation' });
  }
});

app.get('/api/alerts/recent', async (req, res) => {
  try {
    const alerts = await notificationService.getRecentAlerts(24);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recent alerts' });
  }
});

// Start server
const startServer = async () => {
  try {
    // Wait for MongoDB connection first
    await connectToMongoDB();
    
    app.listen(PORT, () => {
      console.log(`🚀 Decision Engine Service running on port ${PORT}`);
      connectMQTT();
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
