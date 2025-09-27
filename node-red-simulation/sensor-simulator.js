const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');

class SensorSimulator {
    constructor() {
        this.client = null;
        this.sensors = {
            soil_moisture: { min: 20, max: 80, current: 45 },
            temperature: { min: 15, max: 35, current: 25 },
            humidity: { min: 30, max: 90, current: 65 },
            light: { min: 100, max: 1000, current: 500 }
        };
        this.deviceId = 'sensor_001';
        this.isRunning = false;
        this.logFile = path.join(__dirname, 'logs', 'sensor-data.log');
        
        // Ensure logs directory exists
        if (!fs.existsSync(path.dirname(this.logFile))) {
            fs.mkdirSync(path.dirname(this.logFile), { recursive: true });
        }
    }

    // Connect to MQTT broker
    async connectToMQTT() {
        try {
            // Use public MQTT broker for testing
            this.client = mqtt.connect('mqtt://test.mosquitto.org:1883', {
                clientId: `sensor_${this.deviceId}_${Date.now()}`,
                clean: true,
                reconnectPeriod: 1000
            });

            this.client.on('connect', () => {
                console.log('✅ Connected to MQTT broker');
                this.logMessage('Connected to MQTT broker');
            });

            this.client.on('error', (error) => {
                console.error('❌ MQTT connection error:', error);
                this.logMessage(`MQTT Error: ${error.message}`);
            });

            this.client.on('disconnect', () => {
                console.log('⚠️ Disconnected from MQTT broker');
                this.logMessage('Disconnected from MQTT broker');
            });

        } catch (error) {
            console.error('❌ Failed to connect to MQTT:', error);
            throw error;
        }
    }

    // Generate realistic sensor data
    generateSensorData(sensorType) {
        const sensor = this.sensors[sensorType];
        if (!sensor) return null;

        // Add some randomness to simulate real sensor behavior
        const variation = (Math.random() - 0.5) * 10; // ±5% variation
        const newValue = Math.max(sensor.min, Math.min(sensor.max, 
            sensor.current + variation));

        // Update current value with some persistence
        sensor.current = sensor.current * 0.8 + newValue * 0.2;

        return {
            device_id: this.deviceId,
            sensor_type: sensorType,
            value: Math.round(sensor.current * 100) / 100,
            unit: this.getUnit(sensorType),
            timestamp: new Date().toISOString(),
            location: {
                lat: -37.8136 + (Math.random() - 0.5) * 0.01,
                lng: 144.9631 + (Math.random() - 0.5) * 0.01
            },
            battery_level: Math.floor(Math.random() * 30) + 70, // 70-100%
            signal_strength: Math.floor(Math.random() * 20) + 80 // 80-100%
        };
    }

    getUnit(sensorType) {
        const units = {
            soil_moisture: '%',
            temperature: '°C',
            humidity: '%',
            light: 'lux'
        };
        return units[sensorType] || 'units';
    }

    // Publish sensor data to MQTT
    async publishSensorData(sensorType) {
        if (!this.client || !this.client.connected) {
            console.log('⚠️ MQTT client not connected, skipping publish');
            return;
        }

        const data = this.generateSensorData(sensorType);
        if (!data) return;

        const topic = `sensors/${sensorType}/${this.deviceId}`;
        const message = JSON.stringify(data);

        try {
            await this.client.publish(topic, message);
            console.log(`📡 Published ${sensorType}: ${data.value}${data.unit}`);
            this.logMessage(`Published ${sensorType}: ${JSON.stringify(data)}`);
        } catch (error) {
            console.error(`❌ Failed to publish ${sensorType}:`, error);
            this.logMessage(`Publish Error ${sensorType}: ${error.message}`);
        }
    }

    // Start sensor simulation
    async startSimulation() {
        if (this.isRunning) {
            console.log('⚠️ Simulation already running');
            return;
        }

        try {
            await this.connectToMQTT();
            
            this.isRunning = true;
            console.log('🚀 Starting sensor simulation...');
            this.logMessage('Sensor simulation started');

            // Publish data every 30 seconds
            this.interval = setInterval(async () => {
                if (this.isRunning) {
                    await this.publishSensorData('soil_moisture');
                    await this.publishSensorData('temperature');
                    await this.publishSensorData('humidity');
                    await this.publishSensorData('light');
                }
            }, 30000);

            // Initial data publish
            setTimeout(async () => {
                await this.publishSensorData('soil_moisture');
                await this.publishSensorData('temperature');
                await this.publishSensorData('humidity');
                await this.publishSensorData('light');
            }, 1000);

        } catch (error) {
            console.error('❌ Failed to start simulation:', error);
            this.logMessage(`Simulation Error: ${error.message}`);
            this.isRunning = false;
        }
    }

    // Stop sensor simulation
    stopSimulation() {
        if (!this.isRunning) {
            console.log('⚠️ Simulation not running');
            return;
        }

        this.isRunning = false;
        
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

        if (this.client) {
            this.client.end();
            this.client = null;
        }

        console.log('🛑 Sensor simulation stopped');
        this.logMessage('Sensor simulation stopped');
    }

    // Log messages to file
    logMessage(message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}\n`;
        
        try {
            fs.appendFileSync(this.logFile, logEntry);
        } catch (error) {
            console.error('❌ Failed to write to log file:', error);
        }
    }

    // Get simulation status
    getStatus() {
        return {
            isRunning: this.isRunning,
            deviceId: this.deviceId,
            sensors: Object.keys(this.sensors),
            mqttConnected: this.client ? this.client.connected : false,
            logFile: this.logFile
        };
    }
}

// Export for use in other modules
module.exports = SensorSimulator;

// Run if called directly
if (require.main === module) {
    const simulator = new SensorSimulator();
    
    console.log('🌱 Smart Agriculture IoT Sensor Simulator');
    console.log('==========================================');
    console.log('Device ID:', simulator.deviceId);
    console.log('Sensors:', Object.keys(simulator.sensors).join(', '));
    console.log('MQTT Broker: test.mosquitto.org:1883');
    console.log('Publish Interval: 30 seconds');
    console.log('==========================================');
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down sensor simulator...');
        simulator.stopSimulation();
        process.exit(0);
    });

    // Start simulation
    simulator.startSimulation().catch(error => {
        console.error('❌ Failed to start simulation:', error);
        process.exit(1);
    });
}
