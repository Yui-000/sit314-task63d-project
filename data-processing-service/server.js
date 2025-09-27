const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const mqtt = require('mqtt');
require('dotenv').config();
const DataProcessor = require('./data-processor');
const DataValidator = require('./data-validator');
const DataAnalyzer = require('./data-analyzer');

const app = express();
const port = 3006;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const connectToMongoDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_agriculture';
    
    if (!process.env.MONGODB_URI) {
      console.warn('⚠️ No MONGODB_URI environment variable found, using local MongoDB');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Data Processing connected to MongoDB:', mongoUri.includes('mongodb+srv') ? 'Atlas (Cloud)' : 'Local');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('📝 Data will be processed in memory only');
  }
};

// MongoDB connection will be handled in startServer()

// MQTT client
let mqttClient = null;
const connectMQTT = () => {
  mqttClient = mqtt.connect('mqtt://test.mosquitto.org:1883', {
    clientId: `data_processor_${Date.now()}`,
    clean: true,
    reconnectPeriod: 1000
  });

  mqttClient.on('connect', () => {
    console.log('✅ Data Processing Service connected to MQTT broker');
    mqttClient.subscribe('sensors/raw');
    mqttClient.subscribe('sensors/processed');
  });

  mqttClient.on('message', async (topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (topic === 'sensors/raw') {
        await processRawSensorData(data);
      } else if (topic === 'sensors/processed') {
        await analyzeProcessedData(data);
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
const dataProcessor = new DataProcessor();
const dataValidator = new DataValidator();
const dataAnalyzer = new DataAnalyzer();

// Process raw sensor data
async function processRawSensorData(rawData) {
  try {
    console.log('📊 Processing raw sensor data:', rawData.device_id);
    
    // Validate data
    const validationResult = dataValidator.validate(rawData);
    if (!validationResult.isValid) {
      console.warn('⚠️ Invalid sensor data:', validationResult.errors);
      return;
    }

    // Filter outliers and clean data
    const cleanedData = await dataProcessor.cleanData(rawData);
    
    // Apply data smoothing
    const smoothedData = dataProcessor.smoothData(cleanedData);
    
    // Calculate derived metrics
    const enrichedData = dataProcessor.enrichData(smoothedData);
    
    // Store processed data
    await dataProcessor.storeProcessedData(enrichedData);
    
    // Publish processed data
    if (mqttClient && mqttClient.connected) {
      mqttClient.publish('sensors/processed', JSON.stringify(enrichedData));
    }
    
    console.log('✅ Data processed and published:', enrichedData.device_id);
    
  } catch (error) {
    console.error('Error processing raw sensor data:', error);
  }
}

// Analyze processed data for patterns and anomalies
async function analyzeProcessedData(processedData) {
  try {
    console.log('🔍 Analyzing processed data:', processedData.device_id);
    
    // Detect anomalies
    const anomalies = await dataAnalyzer.detectAnomalies(processedData);
    
    // Analyze trends
    const trends = await dataAnalyzer.analyzeTrends(processedData);
    
    // Calculate data quality metrics
    const qualityMetrics = dataAnalyzer.calculateQualityMetrics(processedData);
    
    // Store analysis results
    await dataAnalyzer.storeAnalysisResults({
      device_id: processedData.device_id,
      timestamp: processedData.timestamp,
      anomalies: anomalies,
      trends: trends,
      quality_metrics: qualityMetrics
    });
    
    // Publish analysis results if significant
    if (anomalies.length > 0 || trends.significant_changes.length > 0) {
      if (mqttClient && mqttClient.connected) {
        mqttClient.publish('analysis/results', JSON.stringify({
          device_id: processedData.device_id,
          anomalies: anomalies,
          trends: trends,
          quality_metrics: qualityMetrics
        }));
      }
    }
    
  } catch (error) {
    console.error('Error analyzing processed data:', error);
  }
}

// API Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'data-processing',
    mqttConnected: mqttClient ? mqttClient.connected : false
  });
});

app.get('/api/data/quality/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const qualityMetrics = await dataAnalyzer.getQualityMetrics(deviceId, 24);
    res.json(qualityMetrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data quality metrics' });
  }
});

app.get('/api/data/anomalies/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const anomalies = await dataAnalyzer.getAnomalies(deviceId, 24);
    res.json(anomalies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch anomalies' });
  }
});

app.get('/api/data/trends/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const trends = await dataAnalyzer.getTrends(deviceId, 24);
    res.json(trends);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

app.post('/api/data/reprocess/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { startDate, endDate } = req.body;
    
    const result = await dataProcessor.reprocessData(deviceId, startDate, endDate);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reprocess data' });
  }
});

app.get('/api/data/statistics/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { hours = 24 } = req.query;
    
    const statistics = await dataAnalyzer.getStatistics(deviceId, parseInt(hours));
    res.json(statistics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Start server
const startServer = async () => {
  try {
    // Wait for MongoDB connection first
    await connectToMongoDB();
    
    app.listen(port, () => {
      console.log(`listening on port ${port}`);
      connectMQTT();
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
