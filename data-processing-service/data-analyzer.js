const mongoose = require('mongoose');

// Data Analysis Schema
const AnalysisResultSchema = new mongoose.Schema({
  device_id: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, index: true },
  anomalies: [{
    type: { type: String, required: true },
    field: { type: String, required: true },
    value: { type: Number, required: true },
    threshold: { type: Number, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    description: { type: String, required: true }
  }],
  trends: {
    temperature_trend: { type: String, enum: ['increasing', 'decreasing', 'stable'] },
    humidity_trend: { type: String, enum: ['increasing', 'decreasing', 'stable'] },
    soil_moisture_trend: { type: String, enum: ['increasing', 'decreasing', 'stable'] },
    significant_changes: [{
      field: { type: String, required: true },
      change_percentage: { type: Number, required: true },
      time_window: { type: String, required: true }
    }]
  },
  quality_metrics: {
    completeness: { type: Number, min: 0, max: 100 },
    accuracy: { type: Number, min: 0, max: 100 },
    consistency: { type: Number, min: 0, max: 100 },
    timeliness: { type: Number, min: 0, max: 100 }
  }
}, {
  timestamps: true
});

const AnalysisResult = mongoose.model('AnalysisResult', AnalysisResultSchema);

class DataAnalyzer {
  constructor() {
    this.anomalyThresholds = {
      temperature: { low: 5, high: 35 },
      humidity: { low: 20, high: 80 },
      soil_moisture: { low: 10, high: 90 },
      light_intensity: { low: 1000, high: 50000 },
      ph_level: { low: 5.5, high: 8.5 }
    };
  }

  async detectAnomalies(data) {
    const anomalies = [];

    for (const [field, thresholds] of Object.entries(this.anomalyThresholds)) {
      if (data[field] !== undefined && data[field] !== null) {
        const value = data[field];
        
        if (value < thresholds.low) {
          anomalies.push({
            type: 'low_value',
            field: field,
            value: value,
            threshold: thresholds.low,
            severity: this._calculateSeverity(value, thresholds.low, 'low'),
            description: `${field} value ${value} is below normal threshold ${thresholds.low}`
          });
        } else if (value > thresholds.high) {
          anomalies.push({
            type: 'high_value',
            field: field,
            value: value,
            threshold: thresholds.high,
            severity: this._calculateSeverity(value, thresholds.high, 'high'),
            description: `${field} value ${value} is above normal threshold ${thresholds.high}`
          });
        }
      }
    }

    // Detect sudden changes (if we have historical data)
    const suddenChanges = await this._detectSuddenChanges(data);
    anomalies.push(...suddenChanges);

    return anomalies;
  }

  async analyzeTrends(data) {
    const trends = {
      temperature_trend: 'stable',
      humidity_trend: 'stable',
      soil_moisture_trend: 'stable',
      significant_changes: []
    };

    // Get recent data for trend analysis
    const recentData = await this._getRecentData(data.device_id, 24); // Last 24 hours
    
    if (recentData.length > 1) {
      // Analyze temperature trend
      trends.temperature_trend = this._calculateTrend(recentData, 'temperature');
      
      // Analyze humidity trend
      trends.humidity_trend = this._calculateTrend(recentData, 'humidity');
      
      // Analyze soil moisture trend
      trends.soil_moisture_trend = this._calculateTrend(recentData, 'soil_moisture');
      
      // Detect significant changes
      trends.significant_changes = this._detectSignificantChanges(recentData);
    }

    return trends;
  }

  calculateQualityMetrics(data) {
    const metrics = {
      completeness: this._calculateCompleteness(data),
      accuracy: this._calculateAccuracy(data),
      consistency: this._calculateConsistency(data),
      timeliness: this._calculateTimeliness(data)
    };

    return metrics;
  }

  async storeAnalysisResults(analysisData) {
    try {
      const analysisResult = new AnalysisResult(analysisData);
      await analysisResult.save();
      return analysisResult;
    } catch (error) {
      console.error('Error storing analysis results:', error);
      throw error;
    }
  }

  async getQualityMetrics(deviceId, hours = 24) {
    try {
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      const results = await AnalysisResult.find({
        device_id: deviceId,
        timestamp: { $gte: startTime }
      }).sort({ timestamp: -1 });

      if (results.length === 0) {
        return { message: 'No data available for the specified time period' };
      }

      // Calculate average quality metrics
      const avgMetrics = {
        completeness: results.reduce((sum, r) => sum + r.quality_metrics.completeness, 0) / results.length,
        accuracy: results.reduce((sum, r) => sum + r.quality_metrics.accuracy, 0) / results.length,
        consistency: results.reduce((sum, r) => sum + r.quality_metrics.consistency, 0) / results.length,
        timeliness: results.reduce((sum, r) => sum + r.quality_metrics.timeliness, 0) / results.length
      };

      return {
        device_id: deviceId,
        time_period_hours: hours,
        average_metrics: avgMetrics,
        total_analyses: results.length,
        last_updated: results[0].timestamp
      };
    } catch (error) {
      console.error('Error fetching quality metrics:', error);
      throw error;
    }
  }

  async getAnomalies(deviceId, hours = 24) {
    try {
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      const results = await AnalysisResult.find({
        device_id: deviceId,
        timestamp: { $gte: startTime },
        'anomalies.0': { $exists: true }
      }).sort({ timestamp: -1 });

      const allAnomalies = results.flatMap(result => 
        result.anomalies.map(anomaly => ({
          ...anomaly,
          detected_at: result.timestamp,
          device_id: result.device_id
        }))
      );

      return {
        device_id: deviceId,
        time_period_hours: hours,
        total_anomalies: allAnomalies.length,
        anomalies: allAnomalies,
        severity_summary: this._getSeveritySummary(allAnomalies)
      };
    } catch (error) {
      console.error('Error fetching anomalies:', error);
      throw error;
    }
  }

  async getTrends(deviceId, hours = 24) {
    try {
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      const results = await AnalysisResult.find({
        device_id: deviceId,
        timestamp: { $gte: startTime }
      }).sort({ timestamp: -1 });

      if (results.length === 0) {
        return { message: 'No trend data available for the specified time period' };
      }

      const latestTrends = results[0].trends;
      const trendHistory = results.map(r => ({
        timestamp: r.timestamp,
        trends: r.trends
      }));

      return {
        device_id: deviceId,
        time_period_hours: hours,
        current_trends: latestTrends,
        trend_history: trendHistory,
        trend_stability: this._calculateTrendStability(trendHistory)
      };
    } catch (error) {
      console.error('Error fetching trends:', error);
      throw error;
    }
  }

  async getStatistics(deviceId, hours = 24) {
    try {
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      const results = await AnalysisResult.find({
        device_id: deviceId,
        timestamp: { $gte: startTime }
      }).sort({ timestamp: -1 });

      if (results.length === 0) {
        return { message: 'No statistics available for the specified time period' };
      }

      const stats = {
        device_id: deviceId,
        time_period_hours: hours,
        total_analyses: results.length,
        anomaly_rate: this._calculateAnomalyRate(results),
        quality_trend: this._calculateQualityTrend(results),
        most_common_anomalies: this._getMostCommonAnomalies(results),
        data_availability: this._calculateDataAvailability(results, hours)
      };

      return stats;
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw error;
    }
  }

  // Private helper methods
  _calculateSeverity(value, threshold, type) {
    const deviation = Math.abs(value - threshold) / threshold;
    if (deviation > 0.5) return 'critical';
    if (deviation > 0.3) return 'high';
    if (deviation > 0.1) return 'medium';
    return 'low';
  }

  _calculateTrend(data, field) {
    if (data.length < 2) return 'stable';
    
    const values = data.map(d => d[field]).filter(v => v !== undefined && v !== null);
    if (values.length < 2) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;
    
    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (changePercent > 10) return 'increasing';
    if (changePercent < -10) return 'decreasing';
    return 'stable';
  }

  _detectSignificantChanges(data) {
    const changes = [];
    const fields = ['temperature', 'humidity', 'soil_moisture'];
    
    for (const field of fields) {
      const values = data.map(d => d[field]).filter(v => v !== undefined && v !== null);
      if (values.length < 2) continue;
      
      const firstValue = values[0];
      const lastValue = values[values.length - 1];
      const changePercent = ((lastValue - firstValue) / firstValue) * 100;
      
      if (Math.abs(changePercent) > 20) {
        changes.push({
          field: field,
          change_percentage: changePercent,
          time_window: '24h'
        });
      }
    }
    
    return changes;
  }

  _calculateCompleteness(data) {
    const requiredFields = ['temperature', 'humidity', 'soil_moisture', 'light_intensity', 'ph_level'];
    const presentFields = requiredFields.filter(field => data[field] !== undefined && data[field] !== null);
    return (presentFields.length / requiredFields.length) * 100;
  }

  _calculateAccuracy(data) {
    // Simple accuracy calculation based on value ranges
    let accuracyScore = 100;
    
    if (data.temperature < -50 || data.temperature > 100) accuracyScore -= 20;
    if (data.humidity < 0 || data.humidity > 100) accuracyScore -= 20;
    if (data.soil_moisture < 0 || data.soil_moisture > 100) accuracyScore -= 20;
    if (data.ph_level < 0 || data.ph_level > 14) accuracyScore -= 20;
    
    return Math.max(0, accuracyScore);
  }

  _calculateConsistency(data) {
    // Simple consistency check - in a real implementation, this would compare with historical data
    return 85; // Placeholder value
  }

  _calculateTimeliness(data) {
    if (!data.timestamp) return 0;
    
    const now = Date.now();
    const dataTime = new Date(data.timestamp).getTime();
    const delayMinutes = (now - dataTime) / (1000 * 60);
    
    if (delayMinutes <= 5) return 100;
    if (delayMinutes <= 15) return 80;
    if (delayMinutes <= 60) return 60;
    return 20;
  }

  async _getRecentData(deviceId, hours) {
    // This would typically query a database for recent sensor data
    // For now, return empty array as placeholder
    return [];
  }

  async _detectSuddenChanges(data) {
    // Placeholder for sudden change detection
    return [];
  }

  _getSeveritySummary(anomalies) {
    const summary = { low: 0, medium: 0, high: 0, critical: 0 };
    anomalies.forEach(anomaly => {
      summary[anomaly.severity]++;
    });
    return summary;
  }

  _calculateTrendStability(trendHistory) {
    // Placeholder for trend stability calculation
    return 'stable';
  }

  _calculateAnomalyRate(results) {
    const totalAnalyses = results.length;
    const analysesWithAnomalies = results.filter(r => r.anomalies.length > 0).length;
    return totalAnalyses > 0 ? (analysesWithAnomalies / totalAnalyses) * 100 : 0;
  }

  _calculateQualityTrend(results) {
    // Placeholder for quality trend calculation
    return 'stable';
  }

  _getMostCommonAnomalies(results) {
    const anomalyCounts = {};
    results.forEach(result => {
      result.anomalies.forEach(anomaly => {
        const key = `${anomaly.type}_${anomaly.field}`;
        anomalyCounts[key] = (anomalyCounts[key] || 0) + 1;
      });
    });
    
    return Object.entries(anomalyCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([anomaly, count]) => ({ anomaly, count }));
  }

  _calculateDataAvailability(results, hours) {
    const expectedAnalyses = hours; // Assuming one analysis per hour
    const actualAnalyses = results.length;
    return expectedAnalyses > 0 ? (actualAnalyses / expectedAnalyses) * 100 : 0;
  }
}

module.exports = DataAnalyzer;
