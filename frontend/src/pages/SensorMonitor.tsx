import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  Alert,
  Switch,
  FormControlLabel,
  LinearProgress,
} from '@mui/material';
import {
  WaterDrop as WaterIcon,
  Thermostat as TempIcon,
  Opacity as HumidityIcon,
  Lightbulb as LightIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

// Global simulation state management
let globalSimulationState = {
  isSimulating: false,
  listeners: new Set<() => void>()
};

const useSimulationState = () => {
  const [isSimulating, setIsSimulating] = useState(globalSimulationState.isSimulating);

  useEffect(() => {
    const listener = () => setIsSimulating(globalSimulationState.isSimulating);
    globalSimulationState.listeners.add(listener);
    return () => {
      globalSimulationState.listeners.delete(listener);
    };
  }, []);

  const setSimulation = (value: boolean) => {
    globalSimulationState.isSimulating = value;
    globalSimulationState.listeners.forEach(listener => listener());
  };

  return [isSimulating, setSimulation] as const;
};

interface SensorReading {
  timestamp: string;
  soil_moisture: number;
  temperature: number;
  humidity: number;
  light: number;
  device_id: string;
}

interface SensorThresholds {
  soil_moisture: { min: number; max: number };
  temperature: { min: number; max: number };
  humidity: { min: number; max: number };
  light: { min: number; max: number };
}

const SensorMonitor: React.FC = () => {
  const [sensorData, setSensorData] = useState<SensorReading[]>([]);
  const [currentReading, setCurrentReading] = useState<SensorReading | null>(null);
  const [isSimulating, setSimulation] = useSimulationState();
  const [thresholds, setThresholds] = useState<SensorThresholds>({
    soil_moisture: { min: 30, max: 80 },
    temperature: { min: 18, max: 32 },
    humidity: { min: 40, max: 85 },
    light: { min: 100, max: 1000 },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSensorData();
    // Set up real-time updates
    const interval = setInterval(fetchSensorData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchSensorData = async () => {
    try {
      // In a real implementation, this would fetch from your sensor API
      // For now, we'll simulate data with more realistic ranges
      const mockData: SensorReading = {
        timestamp: new Date().toISOString(),
        soil_moisture: Math.random() * 60 + 20,
        temperature: Math.random() * 20 + 15,
        humidity: Math.random() * 50 + 30,
        // Generate light values that sometimes trigger alerts (below 200 lux)
        light: Math.random() < 0.3 ? Math.random() * 150 + 50 : Math.random() * 800 + 200,
        device_id: 'sensor_001',
      };

      setCurrentReading(mockData);
      setSensorData(prev => [...prev.slice(-23), mockData]);
    } catch (error) {
      setError('Failed to fetch sensor data');
    }
  };

  const startSimulation = async () => {
    setLoading(true);
    try {
      // Start the sensor simulator
      const response = await axios.post('http://localhost:3004/api/sensors/start');
      setSimulation(true);
    } catch (error) {
      setError('Failed to start simulation');
    } finally {
      setLoading(false);
    }
  };

  const stopSimulation = async () => {
    setLoading(true);
    try {
      // Stop the sensor simulator
      const response = await axios.post('http://localhost:3004/api/sensors/stop');
      setSimulation(false);
    } catch (error) {
      setError('Failed to stop simulation');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (value: number, min: number, max: number) => {
    if (value < min || value > max) return 'error';
    if (value < min * 1.1 || value > max * 0.9) return 'warning';
    return 'success';
  };

  const SensorCard: React.FC<{
    title: string;
    value: number;
    unit: string;
    icon: React.ReactNode;
    threshold: { min: number; max: number };
  }> = ({ title, value, unit, icon, threshold }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6" component="div">
              {title}
            </Typography>
            <Typography variant="h4" color="primary">
              {value.toFixed(1)} {unit}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Range: {threshold.min}-{threshold.max} {unit}
            </Typography>
          </Box>
          <Box textAlign="center">
            {icon}
            <Chip
              label={value < threshold.min || value > threshold.max ? 'Alert' : 'Normal'}
              color={getStatusColor(value, threshold.min, threshold.max)}
              size="small"
              sx={{ mt: 1 }}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (!currentReading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Sensor Monitoring
        </Typography>
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={isSimulating}
                onChange={isSimulating ? stopSimulation : startSimulation}
                disabled={loading}
              />
            }
            label={isSimulating ? 'Stop Simulation' : 'Start Simulation'}
          />
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Current Sensor Readings */}
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Typography variant="h6" gutterBottom>
            Current Readings
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
            <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 1', md: 'span 1' } }}>
              <SensorCard
                title="Soil Moisture"
                value={currentReading.soil_moisture}
                unit="%"
                icon={<WaterIcon color="primary" sx={{ fontSize: 40 }} />}
                threshold={thresholds.soil_moisture}
              />
            </Box>
            <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 1', md: 'span 1' } }}>
              <SensorCard
                title="Temperature"
                value={currentReading.temperature}
                unit="°C"
                icon={<TempIcon color="secondary" sx={{ fontSize: 40 }} />}
                threshold={thresholds.temperature}
              />
            </Box>
            <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 1', md: 'span 1' } }}>
              <SensorCard
                title="Humidity"
                value={currentReading.humidity}
                unit="%"
                icon={<HumidityIcon color="info" sx={{ fontSize: 40 }} />}
                threshold={thresholds.humidity}
              />
            </Box>
            <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 1', md: 'span 1' } }}>
              <SensorCard
                title="Light"
                value={currentReading.light}
                unit="lux"
                icon={<LightIcon color="warning" sx={{ fontSize: 40 }} />}
                threshold={thresholds.light}
              />
            </Box>
          </Box>
        </Box>

        {/* Historical Data Chart */}
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Historical Data (Last 2 Hours)
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={sensorData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="soil_moisture" 
                    stroke="#4caf50" 
                    strokeWidth={2}
                    name="Soil Moisture (%)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="temperature" 
                    stroke="#ff9800" 
                    strokeWidth={2}
                    name="Temperature (°C)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="humidity" 
                    stroke="#2196f3" 
                    strokeWidth={2}
                    name="Humidity (%)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="light" 
                    stroke="#9c27b0" 
                    strokeWidth={2}
                    name="Light (lux)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>

        {/* Device Information */}
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Device Information
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
                <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 1' } }}>
                  <Typography variant="body2" color="text.secondary">
                    Device ID
                  </Typography>
                  <Typography variant="body1">
                    {currentReading.device_id}
                  </Typography>
                </Box>
                <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 1' } }}>
                  <Typography variant="body2" color="text.secondary">
                    Last Update
                  </Typography>
                  <Typography variant="body1">
                    {new Date(currentReading.timestamp).toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 1' } }}>
                  <Typography variant="body2" color="text.secondary">
                    Simulation Status
                  </Typography>
                  <Chip
                    label={isSimulating ? 'Running' : 'Stopped'}
                    color={isSimulating ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
                <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 1' } }}>
                  <Typography variant="body2" color="text.secondary">
                    Data Points
                  </Typography>
                  <Typography variant="body1">
                    {sensorData.length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default SensorMonitor;
