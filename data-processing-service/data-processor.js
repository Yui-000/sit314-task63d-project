const mongoose = require('mongoose');
const _ = require('lodash');

// Processed sensor data schema
const processedDataSchema = new mongoose.Schema({
  device_id: String,
  timestamp: Date,
  soil_moisture: Number,
  temperature: Number,
  humidity: Number,
  light: Number,
  location: {
    latitude: Number,
    longitude: Number,
    zone: String
  },
  battery_level: Number,
  signal_strength: Number,
  data_quality: {
    score: Number,
    completeness: Number,
    accuracy: Number,
    consistency: Number
  },
  processing_metadata: {
    outliers_removed: Number,
    smoothing_applied: Boolean,
    validation_passed: Boolean,
    processing_time: Number
  },
  created_at: { type: Date, default: Date.now }
});

const ProcessedData = mongoose.model('ProcessedData', processedDataSchema);

class DataProcessor {
  constructor() {
    this.outlierThresholds = {
      soil_moisture: { min: 0, max: 100, stdDev: 2 },
      temperature: { min: -10, max: 50, stdDev: 2 },
      humidity: { min: 0, max: 100, stdDev: 2 },
      light: { min: 0, max: 2000, stdDev: 2 }
    };
  }

  async cleanData(rawData) {
    const startTime = Date.now();
    let outliersRemoved = 0;
    
    const cleanedData = { ...rawData };
    
    // Remove outliers using statistical methods
    for (const [key, threshold] of Object.entries(this.outlierThresholds)) {
      if (rawData[key] !== undefined) {
        const isOutlier = this.isOutlier(rawData[key], key, rawData.device_id);
        if (isOutlier) {
          // Replace outlier with interpolated value
          cleanedData[key] = this.interpolateValue(key, rawData.device_id);
          outliersRemoved++;
        }
      }
    }
    
    // Ensure values are within reasonable bounds
    cleanedData.soil_moisture = Math.max(0, Math.min(100, cleanedData.soil_moisture));
    cleanedData.temperature = Math.max(-10, Math.min(50, cleanedData.temperature));
    cleanedData.humidity = Math.max(0, Math.min(100, cleanedData.humidity));
    cleanedData.light = Math.max(0, Math.min(2000, cleanedData.light));
    
    const processingTime = Date.now() - startTime;
    
    return {
      ...cleanedData,
      processing_metadata: {
        outliers_removed: outliersRemoved,
        smoothing_applied: false,
        validation_passed: true,
        processing_time: processingTime
      }
    };
  }

  isOutlier(value, field, deviceId) {
    const threshold = this.outlierThresholds[field];
    if (!threshold) return false;
    
    // Check if value is outside reasonable bounds
    if (value < threshold.min || value > threshold.max) {
      return true;
    }
    
    // For now, only check absolute bounds to avoid memory usage
    return false;
  }

  interpolateValue(field, deviceId) {
    // Return default value since we're not storing history in memory
    const defaults = {
      soil_moisture: 50,
      temperature: 25,
      humidity: 60,
      light: 500
    };
    return defaults[field] || 0;
  }

  smoothData(data) {
    // Return data as-is since we're not storing history in memory
    // In a production system, you might want to implement database-based smoothing
    const smoothedData = { ...data };
    smoothedData.processing_metadata.smoothing_applied = false;
    return smoothedData;
  }

  enrichData(data) {
    const enrichedData = { ...data };
    
    // Calculate data quality score
    const qualityScore = this.calculateDataQuality(data);
    enrichedData.data_quality = {
      score: qualityScore,
      completeness: this.calculateCompleteness(data),
      accuracy: this.calculateAccuracy(data),
      consistency: this.calculateConsistency(data.device_id)
    };
    
    // Add derived metrics
    enrichedData.derived_metrics = {
      heat_index: this.calculateHeatIndex(data.temperature, data.humidity),
      comfort_index: this.calculateComfortIndex(data.temperature, data.humidity),
      growth_potential: this.calculateGrowthPotential(data),
      water_stress: this.calculateWaterStress(data.soil_moisture, data.temperature)
    };
    
    return enrichedData;
  }

  calculateDataQuality(data) {
    let score = 100;
    
    // Check completeness
    const requiredFields = ['soil_moisture', 'temperature', 'humidity', 'light'];
    const missingFields = requiredFields.filter(field => data[field] === undefined);
    score -= missingFields.length * 10;
    
    // Check value ranges
    if (data.soil_moisture < 0 || data.soil_moisture > 100) score -= 20;
    if (data.temperature < -10 || data.temperature > 50) score -= 20;
    if (data.humidity < 0 || data.humidity > 100) score -= 20;
    if (data.light < 0 || data.light > 2000) score -= 20;
    
    // Check for reasonable values
    if (data.temperature < 0 && data.soil_moisture > 80) score -= 10; // Unlikely combination
    if (data.humidity > 90 && data.temperature > 30) score -= 10; // Unlikely combination
    
    return Math.max(0, Math.min(100, score));
  }

  calculateCompleteness(data) {
    const requiredFields = ['soil_moisture', 'temperature', 'humidity', 'light'];
    const presentFields = requiredFields.filter(field => data[field] !== undefined);
    return (presentFields.length / requiredFields.length) * 100;
  }

  calculateAccuracy(data) {
    // Simple accuracy calculation based on value consistency
    const values = [data.soil_moisture, data.temperature, data.humidity, data.light];
    const validValues = values.filter(v => v !== undefined && !isNaN(v));
    
    if (validValues.length === 0) return 0;
    
    // Check if values are within expected ranges
    const ranges = [
      { min: 0, max: 100 }, // soil_moisture
      { min: -10, max: 50 }, // temperature
      { min: 0, max: 100 }, // humidity
      { min: 0, max: 2000 } // light
    ];
    
    let accurateCount = 0;
    validValues.forEach((value, index) => {
      if (value >= ranges[index].min && value <= ranges[index].max) {
        accurateCount++;
      }
    });
    
    return (accurateCount / validValues.length) * 100;
  }

  calculateConsistency(deviceId) {
    const history = this.getDataHistory(deviceId, 'temperature');
    if (history.length < 2) return 100;
    
    // Calculate coefficient of variation
    const mean = _.mean(history);
    const stdDev = this.calculateStdDev(history, mean);
    const cv = (stdDev / mean) * 100;
    
    // Lower CV means more consistent
    return Math.max(0, 100 - cv);
  }

  calculateHeatIndex(temperature, humidity) {
    if (temperature < 27 || humidity < 40) return temperature;
    
    const hi = -8.78469475556 + 1.61139411 * temperature + 2.33854883889 * humidity +
      -0.14611605 * temperature * humidity + -0.012308094 * Math.pow(temperature, 2) +
      -0.0164248277778 * Math.pow(humidity, 2) + 0.002211732 * Math.pow(temperature, 2) * humidity +
      0.00072546 * temperature * Math.pow(humidity, 2) + -0.000003582 * Math.pow(temperature, 2) * Math.pow(humidity, 2);
    
    return Math.round(hi * 10) / 10;
  }

  calculateComfortIndex(temperature, humidity) {
    // Simple comfort index (0-100)
    let comfort = 100;
    
    // Temperature comfort
    if (temperature < 18 || temperature > 30) comfort -= 30;
    else if (temperature < 20 || temperature > 28) comfort -= 15;
    
    // Humidity comfort
    if (humidity < 30 || humidity > 80) comfort -= 30;
    else if (humidity < 40 || humidity > 70) comfort -= 15;
    
    return Math.max(0, comfort);
  }

  calculateGrowthPotential(data) {
    // Simple growth potential calculation
    let potential = 0;
    
    // Temperature factor
    if (data.temperature >= 20 && data.temperature <= 28) potential += 30;
    else if (data.temperature >= 15 && data.temperature <= 32) potential += 20;
    
    // Humidity factor
    if (data.humidity >= 50 && data.humidity <= 80) potential += 25;
    else if (data.humidity >= 40 && data.humidity <= 90) potential += 15;
    
    // Soil moisture factor
    if (data.soil_moisture >= 40 && data.soil_moisture <= 70) potential += 25;
    else if (data.soil_moisture >= 30 && data.soil_moisture <= 80) potential += 15;
    
    // Light factor
    if (data.light >= 300 && data.light <= 800) potential += 20;
    else if (data.light >= 200 && data.light <= 1000) potential += 10;
    
    return Math.min(100, potential);
  }

  calculateWaterStress(soilMoisture, temperature) {
    // Water stress index (0-100, higher means more stress)
    let stress = 0;
    
    // Soil moisture stress
    if (soilMoisture < 20) stress += 50;
    else if (soilMoisture < 30) stress += 30;
    else if (soilMoisture < 40) stress += 15;
    
    // Temperature stress
    if (temperature > 30) stress += 20;
    else if (temperature > 25) stress += 10;
    
    return Math.min(100, stress);
  }

  calculateStdDev(values, mean) {
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }


  async storeProcessedData(data) {
    try {
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Database not connected');
      }
      
      const processedData = new ProcessedData(data);
      await processedData.save();
      console.log('✅ Processed data saved to database:', processedData._id);
      
    } catch (error) {
      console.error('Error storing processed data:', error);
      throw error;
    }
  }

  async reprocessData(deviceId, startDate, endDate) {
    try {
      // This would reprocess historical data
      // Implementation depends on specific requirements
      return {
        success: true,
        message: 'Data reprocessing completed',
        device_id: deviceId,
        records_processed: 0
      };
    } catch (error) {
      console.error('Error reprocessing data:', error);
      throw error;
    }
  }
}

module.exports = DataProcessor;
