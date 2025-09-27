const mongoose = require('mongoose');

// Decision schema
const decisionSchema = new mongoose.Schema({
  sensor_data: {
    device_id: String,
    timestamp: Date,
    soil_moisture: Number,
    temperature: Number,
    humidity: Number,
    light: Number
  },
  decisions: [{
    action: String,
    duration: Number,
    amount: Number,
    priority: String,
    reason: String,
    executed: { type: Boolean, default: false },
    executed_at: Date
  }],
  timestamp: { type: Date, default: Date.now }
});

const Decision = mongoose.model('Decision', decisionSchema);

class DecisionEngine {
  constructor() {
    this.thresholds = {
      soil_moisture: {
        min: 30,
        max: 80,
        critical_min: 15,
        critical_max: 90
      },
      temperature: {
        min: 18,
        max: 32,
        critical_min: 5,
        critical_max: 40
      },
      humidity: {
        min: 40,
        max: 85,
        critical_min: 20,
        critical_max: 95
      },
      light: {
        min: 200,
        max: 1000,
        critical_min: 50,
        critical_max: 1500
      }
    };
    
    this.lastFertilizerDate = new Map();
  }

  async analyzeData(sensorData) {
    const decisions = [];
    const { soil_moisture, temperature, humidity, light, device_id } = sensorData;

    // Irrigation decisions
    if (soil_moisture < this.thresholds.soil_moisture.min) {
      const duration = this.calculateIrrigationDuration(soil_moisture);
      decisions.push({
        action: 'irrigate',
        duration: duration,
        priority: soil_moisture < this.thresholds.soil_moisture.critical_min ? 'critical' : 'high',
        reason: `Soil moisture ${soil_moisture}% is below threshold ${this.thresholds.soil_moisture.min}%`
      });
    } else if (soil_moisture > this.thresholds.soil_moisture.max) {
      decisions.push({
        action: 'drain',
        duration: 300,
        priority: 'medium',
        reason: `Soil moisture ${soil_moisture}% is above threshold ${this.thresholds.soil_moisture.max}%`
      });
    }

    // Fertilization decisions
    if (this.shouldFertilize(temperature, humidity, device_id)) {
      const amount = this.calculateFertilizerAmount(temperature, humidity);
      decisions.push({
        action: 'fertilize',
        amount: amount,
        priority: 'medium',
        reason: 'Optimal conditions for fertilization'
      });
      this.lastFertilizerDate.set(device_id, Date.now());
    }

    // Temperature alerts
    if (temperature < this.thresholds.temperature.critical_min || 
        temperature > this.thresholds.temperature.critical_max) {
      decisions.push({
        action: 'alert',
        message: `Extreme temperature: ${temperature}°C`,
        priority: 'critical',
        reason: `Temperature outside safe range (${this.thresholds.temperature.critical_min}-${this.thresholds.temperature.critical_max}°C)`
      });
    }

    // Humidity alerts
    if (humidity < this.thresholds.humidity.critical_min || 
        humidity > this.thresholds.humidity.critical_max) {
      decisions.push({
        action: 'alert',
        message: `Extreme humidity: ${humidity}%`,
        priority: 'high',
        reason: `Humidity outside safe range (${this.thresholds.humidity.critical_min}-${this.thresholds.humidity.critical_max}%)`
      });
    }

    // Light alerts
    if (light < this.thresholds.light.critical_min) {
      decisions.push({
        action: 'alert',
        message: `Insufficient light: ${light} lux`,
        priority: 'medium',
        reason: `Light level below critical threshold ${this.thresholds.light.critical_min} lux`
      });
    }

    return decisions;
  }

  calculateIrrigationDuration(soilMoisture) {
    const deficit = this.thresholds.soil_moisture.min - soilMoisture;
    // Base duration + additional time based on deficit
    const baseDuration = 300; // 5 minutes
    const additionalDuration = Math.min(deficit * 10, 600); // Max 10 minutes additional
    return Math.min(baseDuration + additionalDuration, 1200); // Max 20 minutes total
  }

  shouldFertilize(temperature, humidity, deviceId) {
    // Check if conditions are optimal for fertilization
    const tempOptimal = temperature >= 20 && temperature <= 30;
    const humidityOptimal = humidity >= 40 && humidity <= 80;
    
    if (!tempOptimal || !humidityOptimal) {
      return false;
    }

    // Check if enough time has passed since last fertilization
    const lastFertilizer = this.lastFertilizerDate.get(deviceId);
    if (!lastFertilizer) {
      return true; // First time fertilizing
    }

    const daysSinceLastFertilizer = (Date.now() - lastFertilizer) / (1000 * 60 * 60 * 24);
    return daysSinceLastFertilizer >= 7; // Fertilize every 7 days
  }

  calculateFertilizerAmount(temperature, humidity) {
    // Base amount + adjustments based on conditions
    let amount = 50; // Base 50ml
    
    // Temperature adjustment
    if (temperature > 25) {
      amount += 10; // More fertilizer in warmer conditions
    }
    
    // Humidity adjustment
    if (humidity < 60) {
      amount += 5; // Slightly more in drier conditions
    }
    
    return Math.min(amount, 100); // Max 100ml
  }

  checkAlerts(sensorData) {
    const alerts = [];
    const { soil_moisture, temperature, humidity, light, device_id } = sensorData;

    // Critical soil moisture
    if (soil_moisture < this.thresholds.soil_moisture.critical_min) {
      alerts.push({
        type: 'critical',
        message: 'Critical: Soil moisture extremely low',
        value: soil_moisture,
        threshold: this.thresholds.soil_moisture.critical_min,
        device_id: device_id
      });
    }

    // Critical temperature
    if (temperature < this.thresholds.temperature.critical_min || 
        temperature > this.thresholds.temperature.critical_max) {
      alerts.push({
        type: 'critical',
        message: 'Critical: Temperature outside safe range',
        value: temperature,
        threshold: `${this.thresholds.temperature.critical_min}-${this.thresholds.temperature.critical_max}`,
        device_id: device_id
      });
    }

    // Warning humidity
    if (humidity < this.thresholds.humidity.min || humidity > this.thresholds.humidity.max) {
      alerts.push({
        type: 'warning',
        message: 'Warning: Humidity outside optimal range',
        value: humidity,
        threshold: `${this.thresholds.humidity.min}-${this.thresholds.humidity.max}`,
        device_id: device_id
      });
    }

    // Warning light
    if (light < this.thresholds.light.min) {
      alerts.push({
        type: 'warning',
        message: 'Warning: Insufficient light',
        value: light,
        threshold: this.thresholds.light.min,
        device_id: device_id
      });
    }

    return alerts;
  }

  async logDecision(decisionData) {
    const decision = new Decision(decisionData);
    await decision.save();
    console.log('✅ Decision saved to database:', decision._id);
    return decision;
  }

  async getRecentDecisions(hours = 24) {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return await Decision.find({
      timestamp: { $gte: cutoffTime }
    }).sort({ timestamp: -1 }).limit(50);
  }

  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  getThresholds() {
    return this.thresholds;
  }
}

module.exports = DecisionEngine;
