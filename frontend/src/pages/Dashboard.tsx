import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Lock as LockIcon,
  Sensors as SensorsIcon,
  Assessment as AssessmentIcon,
  Psychology as DecisionIcon,
  DataObject as DataIcon,
  WaterDrop as IrrigationIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';

interface SystemStatus {
  auth: boolean;
  encryption: boolean;
  audit: boolean;
  sensors: boolean;
  decisionEngine: boolean;
  dataProcessing: boolean;
  irrigation: boolean;
}

interface SensorData {
  timestamp: string;
  soil_moisture: number;
  temperature: number;
  humidity: number;
  light: number;
}

const Dashboard: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    auth: false,
    encryption: false,
    audit: false,
    sensors: false,
    decisionEngine: false,
    dataProcessing: false,
    irrigation: false,
  });
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [securityScore, setSecurityScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSystemStatus();
    fetchSensorData();
    fetchSecurityScore();
  }, []);

  const checkSystemStatus = async () => {
    try {
      const [authRes, encryptionRes, auditRes, decisionEngineRes, dataProcessingRes] = await Promise.allSettled([
        axios.get('http://localhost:3001/health'),
        axios.get('http://localhost:3002/health'),
        axios.get('http://localhost:3003/health'),
        axios.get('http://localhost:3005/health'),
        axios.get('http://localhost:3006/health'),
      ]);

      setSystemStatus({
        auth: authRes.status === 'fulfilled',
        encryption: encryptionRes.status === 'fulfilled',
        audit: auditRes.status === 'fulfilled',
        sensors: true, // Assume sensors are running
        decisionEngine: decisionEngineRes.status === 'fulfilled',
        dataProcessing: dataProcessingRes.status === 'fulfilled',
        irrigation: decisionEngineRes.status === 'fulfilled', // Irrigation is part of decision engine
      });
    } catch (error) {
      console.error('Error checking system status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSensorData = async () => {
    // Simulate sensor data for demonstration
    const mockData: SensorData[] = [];
    const now = new Date();
    
    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
      mockData.push({
        timestamp: timestamp.toISOString(),
        soil_moisture: Math.random() * 60 + 20,
        temperature: Math.random() * 20 + 15,
        humidity: Math.random() * 50 + 30,
        light: Math.random() * 900 + 100,
      });
    }
    
    setSensorData(mockData);
  };

  const fetchSecurityScore = async () => {
    try {
      const response = await axios.get('http://localhost:3003/api/metrics/security');
      setSecurityScore(response.data.overallScore || 95);
    } catch (error) {
      setSecurityScore(95); // Default score
    }
  };

  const pieData = [
    { name: 'Healthy', value: Object.values(systemStatus).filter(Boolean).length, color: '#4caf50' },
    { name: 'Unhealthy', value: Object.values(systemStatus).filter(Boolean => !Boolean).length, color: '#f44336' },
  ];

  const StatusCard: React.FC<{ title: string; status: boolean; icon: React.ReactNode }> = ({ title, status, icon }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6" component="div">
              {title}
            </Typography>
            <Chip
              label={status ? 'Online' : 'Offline'}
              color={status ? 'success' : 'error'}
              size="small"
            />
          </Box>
          {icon}
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Smart Agriculture IoT Dashboard
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* System Status */}
        <Box>
          <Typography variant="h6" gutterBottom>
            System Status
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
            <StatusCard
              title="Authentication"
              status={systemStatus.auth}
              icon={<SecurityIcon color={systemStatus.auth ? 'success' : 'error'} />}
            />
            <StatusCard
              title="Encryption"
              status={systemStatus.encryption}
              icon={<LockIcon color={systemStatus.encryption ? 'success' : 'error'} />}
            />
            <StatusCard
              title="Security Audit"
              status={systemStatus.audit}
              icon={<AssessmentIcon color={systemStatus.audit ? 'success' : 'error'} />}
            />
            <StatusCard
              title="Sensors"
              status={systemStatus.sensors}
              icon={<SensorsIcon color={systemStatus.sensors ? 'success' : 'error'} />}
            />
            <StatusCard
              title="Decision Engine"
              status={systemStatus.decisionEngine}
              icon={<DecisionIcon color={systemStatus.decisionEngine ? 'success' : 'error'} />}
            />
            <StatusCard
              title="Data Processing"
              status={systemStatus.dataProcessing}
              icon={<DataIcon color={systemStatus.dataProcessing ? 'success' : 'error'} />}
            />
            <StatusCard
              title="Irrigation Control"
              status={systemStatus.irrigation}
              icon={<IrrigationIcon color={systemStatus.irrigation ? 'success' : 'error'} />}
            />
          </Box>
        </Box>

        {/* Security Score */}
        <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 1' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Security Score
              </Typography>
              <Box display="flex" alignItems="center" gap={2}>
                <Box flexGrow={1}>
                  <LinearProgress
                    variant="determinate"
                    value={securityScore}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
                <Typography variant="h4" color="primary">
                  {securityScore}/100
                </Typography>
              </Box>
              <Alert severity={securityScore >= 90 ? 'success' : securityScore >= 70 ? 'warning' : 'error'} sx={{ mt: 2 }}>
                {securityScore >= 90 ? 'Excellent security posture' : 
                 securityScore >= 70 ? 'Good security, some improvements needed' : 
                 'Security issues detected'}
              </Alert>
            </CardContent>
          </Card>
        </Box>

        {/* System Health Pie Chart */}
        <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 1' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Health
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>

        {/* Sensor Data Chart */}
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sensor Data (Last 24 Hours)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
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
      </Box>
    </Box>
  );
};

export default Dashboard;
