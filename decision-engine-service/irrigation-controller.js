const mongoose = require('mongoose');
const mqtt = require('mqtt');

// Irrigation log schema
const irrigationLogSchema = new mongoose.Schema({
  device_id: String,
  action: String,
  duration: Number,
  amount: Number,
  status: String,
  reason: String,
  started_at: Date,
  completed_at: Date,
  created_at: { type: Date, default: Date.now }
});

const IrrigationLog = mongoose.model('IrrigationLog', irrigationLogSchema);

class IrrigationController {
  constructor() {
    this.activeIrrigations = new Map();
    this.irrigationStatus = {
      isRunning: false,
      currentDevice: null,
      startTime: null,
      duration: 0,
      remainingTime: 0
    };
    
    // MQTT client for actuator control
    this.mqttClient = null;
    this.connectMQTT();
    this.initializeSampleStatus();
  }

  initializeSampleStatus() {
    // Simulate a running irrigation for demo
    this.irrigationStatus = {
      isRunning: true,
      currentDevice: 'manual_control',
      startTime: Date.now() - 60000, // Started 1 minute ago
      duration: 300, // 5 minutes total
      remainingTime: 240 // 4 minutes remaining
    };
    
    // Update remaining time every second
    setInterval(() => {
      if (this.irrigationStatus.isRunning) {
        const elapsed = Date.now() - this.irrigationStatus.startTime;
        const remaining = Math.max(0, this.irrigationStatus.duration * 1000 - elapsed);
        this.irrigationStatus.remainingTime = Math.floor(remaining / 1000);
        
        if (this.irrigationStatus.remainingTime <= 0) {
          this.irrigationStatus.isRunning = false;
          this.irrigationStatus.currentDevice = null;
        }
      }
    }, 1000);
    
    console.log('💧 Sample irrigation status initialized');
  }

  connectMQTT() {
    this.mqttClient = mqtt.connect('mqtt://test.mosquitto.org:1883', {
      clientId: `irrigation_controller_${Date.now()}`,
      clean: true,
      reconnectPeriod: 1000
    });

    this.mqttClient.on('connect', () => {
      console.log('✅ Irrigation Controller connected to MQTT broker');
      this.mqttClient.subscribe('actuators/irrigation/status');
      this.mqttClient.subscribe('actuators/fertilizer/status');
    });

    this.mqttClient.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        this.handleActuatorStatus(topic, data);
      } catch (error) {
        console.error('Error processing actuator status:', error);
      }
    });

    this.mqttClient.on('error', (error) => {
      console.error('❌ Irrigation Controller MQTT error:', error);
    });
  }

  async startIrrigation({ duration, device_id, reason }) {
    try {
      console.log(`🚿 Starting irrigation for device ${device_id}, duration: ${duration}s`);
      
      // Check if irrigation is already running
      if (this.irrigationStatus.isRunning) {
        throw new Error('Irrigation already in progress');
      }

      // Create irrigation log
      const irrigationLog = new IrrigationLog({
        device_id: device_id,
        action: 'irrigate',
        duration: duration,
        status: 'starting',
        reason: reason,
        started_at: new Date()
      });
      await irrigationLog.save();

      // Update status
      this.irrigationStatus = {
        isRunning: true,
        currentDevice: device_id,
        startTime: Date.now(),
        duration: duration,
        remainingTime: duration
      };

      // Send MQTT command to actuator
      if (this.mqttClient && this.mqttClient.connected) {
        const command = {
          action: 'start',
          duration: duration,
          device_id: device_id,
          timestamp: new Date().toISOString()
        };
        
        this.mqttClient.publish('actuators/irrigation/command', JSON.stringify(command));
        console.log('📡 Irrigation command sent via MQTT');
      }

      // Set timer for automatic stop
      setTimeout(() => {
        this.stopIrrigation(device_id);
      }, duration * 1000);

      // Update log status
      irrigationLog.status = 'running';
      await irrigationLog.save();

      return {
        success: true,
        message: 'Irrigation started successfully',
        device_id: device_id,
        duration: duration
      };

    } catch (error) {
      console.error('Error starting irrigation:', error);
      throw error;
    }
  }

  async stopIrrigation(device_id) {
    try {
      console.log(`🛑 Stopping irrigation for device ${device_id}`);
      
      if (!this.irrigationStatus.isRunning || this.irrigationStatus.currentDevice !== device_id) {
        console.log('No active irrigation to stop');
        return;
      }

      // Send MQTT stop command
      if (this.mqttClient && this.mqttClient.connected) {
        const command = {
          action: 'stop',
          device_id: device_id,
          timestamp: new Date().toISOString()
        };
        
        this.mqttClient.publish('actuators/irrigation/command', JSON.stringify(command));
        console.log('📡 Irrigation stop command sent via MQTT');
      }

      // Update status
      this.irrigationStatus = {
        isRunning: false,
        currentDevice: null,
        startTime: null,
        duration: 0,
        remainingTime: 0
      };

      // Update log
      const irrigationLog = await IrrigationLog.findOne({
        device_id: device_id,
        status: 'running'
      }).sort({ started_at: -1 });

      if (irrigationLog) {
        irrigationLog.status = 'completed';
        irrigationLog.completed_at = new Date();
        await irrigationLog.save();
      }

      return {
        success: true,
        message: 'Irrigation stopped successfully',
        device_id: device_id
      };

    } catch (error) {
      console.error('Error stopping irrigation:', error);
      throw error;
    }
  }

  async dispenseFertilizer({ amount, device_id, reason }) {
    try {
      console.log(`🌱 Dispensing fertilizer for device ${device_id}, amount: ${amount}ml`);
      
      // Create fertilizer log
      const fertilizerLog = new IrrigationLog({
        device_id: device_id,
        action: 'fertilize',
        amount: amount,
        status: 'starting',
        reason: reason,
        started_at: new Date()
      });
      await fertilizerLog.save();

      // Send MQTT command to fertilizer dispenser
      if (this.mqttClient && this.mqttClient.connected) {
        const command = {
          action: 'dispense',
          amount: amount,
          device_id: device_id,
          timestamp: new Date().toISOString()
        };
        
        this.mqttClient.publish('actuators/fertilizer/command', JSON.stringify(command));
        console.log('📡 Fertilizer command sent via MQTT');
      }

      // Update log status
      fertilizerLog.status = 'completed';
      fertilizerLog.completed_at = new Date();
      await fertilizerLog.save();

      return {
        success: true,
        message: 'Fertilizer dispensed successfully',
        device_id: device_id,
        amount: amount
      };

    } catch (error) {
      console.error('Error dispensing fertilizer:', error);
      throw error;
    }
  }

  handleActuatorStatus(topic, data) {
    console.log(`📊 Actuator status update: ${topic}`, data);
    
    if (topic === 'actuators/irrigation/status') {
      this.updateIrrigationStatus(data);
    } else if (topic === 'actuators/fertilizer/status') {
      this.updateFertilizerStatus(data);
    }
  }

  updateIrrigationStatus(data) {
    if (data.status === 'running') {
      this.irrigationStatus.isRunning = true;
      this.irrigationStatus.currentDevice = data.device_id;
    } else if (data.status === 'stopped') {
      this.irrigationStatus.isRunning = false;
      this.irrigationStatus.currentDevice = null;
    }
  }

  updateFertilizerStatus(data) {
    console.log(`🌱 Fertilizer status: ${data.status} for device ${data.device_id}`);
  }

  async getStatus() {
    return {
      irrigation: this.irrigationStatus,
      mqttConnected: this.mqttClient ? this.mqttClient.connected : false,
      timestamp: new Date().toISOString()
    };
  }

  async getRecentLogs(hours = 24) {
    try {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      return await IrrigationLog.find({
        created_at: { $gte: cutoffTime }
      }).sort({ created_at: -1 }).limit(50);
    } catch (error) {
      console.error('Error fetching irrigation logs:', error);
      return [];
    }
  }

  async getIrrigationHistory(device_id, days = 7) {
    try {
      const cutoffTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      return await IrrigationLog.find({
        device_id: device_id,
        action: 'irrigate',
        created_at: { $gte: cutoffTime }
      }).sort({ created_at: -1 });
    } catch (error) {
      console.error('Error fetching irrigation history:', error);
      return [];
    }
  }

  // Emergency stop all irrigation
  async emergencyStop() {
    try {
      console.log('🚨 Emergency stop all irrigation');
      
      if (this.irrigationStatus.isRunning) {
        await this.stopIrrigation(this.irrigationStatus.currentDevice);
      }

      // Send emergency stop command
      if (this.mqttClient && this.mqttClient.connected) {
        const command = {
          action: 'emergency_stop',
          timestamp: new Date().toISOString()
        };
        
        this.mqttClient.publish('actuators/irrigation/command', JSON.stringify(command));
      }

      return { success: true, message: 'Emergency stop executed' };
    } catch (error) {
      console.error('Error in emergency stop:', error);
      throw error;
    }
  }
}

module.exports = IrrigationController;
