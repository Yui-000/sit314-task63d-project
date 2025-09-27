const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');

const app = express();
const PORT = 3004;

// Middleware
app.use(cors());
app.use(express.json());

// MQTT client for sensor simulation
let mqttClient = null;
let isSimulating = false;

// Connect to MQTT broker
const connectMQTT = () => {
  mqttClient = mqtt.connect('mqtt://test.mosquitto.org:1883', {
    clientId: `sensor_api_${Date.now()}`,
    clean: true,
    reconnectPeriod: 1000
  });

  mqttClient.on('connect', () => {
    console.log('✅ Connected to MQTT broker');
  });

  mqttClient.on('error', (error) => {
    console.error('❌ MQTT connection error:', error);
  });
};

// Sensor simulation data
const sensors = {
  soil_moisture: { min: 20, max: 80, current: 45 },
  temperature: { min: 15, max: 35, current: 25 },
  humidity: { min: 30, max: 90, current: 65 },
  light: { min: 100, max: 1000, current: 500 }
};

// Simulate sensor data with realistic patterns
const simulateSensorData = () => {
  if (!isSimulating || !mqttClient) return;

  // Add realistic patterns to sensor data
  const now = new Date();
  const hour = now.getHours();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  
  // Temperature follows daily pattern
  const baseTemp = 20 + 10 * Math.sin((hour - 6) * Math.PI / 12);
  const tempVariation = (Math.random() - 0.5) * 4;
  const temperature = Math.max(5, Math.min(40, baseTemp + tempVariation));
  
  // Humidity inversely related to temperature
  const baseHumidity = 80 - (temperature - 15) * 2;
  const humidityVariation = (Math.random() - 0.5) * 20;
  const humidity = Math.max(20, Math.min(95, baseHumidity + humidityVariation));
  
  // Soil moisture decreases over time, increases with irrigation
  const soilMoistureDecay = 0.1; // Decrease by 0.1% per hour
  const currentSoilMoisture = sensors.soil_moisture.current || 50;
  const newSoilMoisture = Math.max(10, currentSoilMoisture - soilMoistureDecay + (Math.random() - 0.5) * 2);
  
  // Light follows daily pattern
  const lightIntensity = hour >= 6 && hour <= 18 ? 
    Math.max(0, 1000 * Math.sin((hour - 6) * Math.PI / 12) + (Math.random() - 0.5) * 200) : 
    Math.random() * 50;

  const sensorData = {
    device_id: 'sensor_001',
    timestamp: new Date().toISOString(),
    soil_moisture: Math.round(newSoilMoisture * 10) / 10,
    temperature: Math.round(temperature * 10) / 10,
    humidity: Math.round(humidity * 10) / 10,
    light: Math.round(lightIntensity),
    location: {
      latitude: -37.8136,
      longitude: 144.9631,
      zone: 'Zone A'
    },
    battery_level: Math.max(20, 100 - (dayOfYear * 0.1)), // Battery decreases over time
    signal_strength: Math.floor(Math.random() * 40) + 60 // 60-100%
  };

  // Publish to MQTT
  mqttClient.publish('sensors/data', JSON.stringify(sensorData));
  mqttClient.publish('sensors/raw', JSON.stringify(sensorData));
  
  // Update current values
  sensors.soil_moisture.current = sensorData.soil_moisture;
  sensors.temperature.current = sensorData.temperature;
  sensors.humidity.current = sensorData.humidity;
  sensors.light.current = sensorData.light;

  console.log('📊 Published sensor data:', sensorData);
};

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'sensor-api-server',
    mqttConnected: mqttClient ? mqttClient.connected : false,
    simulating: isSimulating
  });
});

app.get('/api/sensors/status', (req, res) => {
  res.json({
    simulating: isSimulating,
    mqttConnected: mqttClient ? mqttClient.connected : false,
    currentValues: sensors
  });
});

app.post('/api/sensors/start', (req, res) => {
  if (isSimulating) {
    return res.json({ message: 'Simulation already running' });
  }

  isSimulating = true;
  
  // Start simulation every 5 seconds
  const interval = setInterval(simulateSensorData, 5000);
  
  // Store interval ID for cleanup
  app.locals.simulationInterval = interval;
  
  res.json({ 
    message: 'Sensor simulation started',
    interval: '5 seconds'
  });
});

app.post('/api/sensors/stop', (req, res) => {
  if (!isSimulating) {
    return res.json({ message: 'Simulation not running' });
  }

  isSimulating = false;
  
  // Clear interval
  if (app.locals.simulationInterval) {
    clearInterval(app.locals.simulationInterval);
    app.locals.simulationInterval = null;
  }
  
  res.json({ message: 'Sensor simulation stopped' });
});

app.get('/api/sensors/data', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    sensors: sensors,
    simulating: isSimulating
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Sensor API Server running on port ${PORT}`);
  connectMQTT();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down sensor API server...');
  if (app.locals.simulationInterval) {
    clearInterval(app.locals.simulationInterval);
  }
  if (mqttClient) {
    mqttClient.end();
  }
  process.exit(0);
});
