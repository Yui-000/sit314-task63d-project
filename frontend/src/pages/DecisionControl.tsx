import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Psychology as DecisionIcon,
  WaterDrop as IrrigationIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface Decision {
  id: string;
  action: string;
  duration?: number;
  amount?: number;
  priority: string;
  reason: string;
  executed: boolean;
  executed_at?: string;
  timestamp: string;
}

interface IrrigationStatus {
  isRunning: boolean;
  currentDevice: string | null;
  startTime: number | null;
  duration: number;
  remainingTime: number;
}

interface Alert {
  id: string;
  type: string;
  message: string;
  value: number;
  threshold: string;
  device_id: string;
  timestamp: string;
}

const DecisionControl: React.FC = () => {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [irrigationStatus, setIrrigationStatus] = useState<IrrigationStatus | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [decisionsRes, irrigationRes, alertsRes] = await Promise.allSettled([
        axios.get('http://localhost:3005/api/decisions/recent'),
        axios.get('http://localhost:3005/api/irrigation/status'),
        axios.get('http://localhost:3005/api/alerts/recent'),
      ]);

      if (decisionsRes.status === 'fulfilled') {
        setDecisions(decisionsRes.value.data);
      }

      if (irrigationRes.status === 'fulfilled') {
        setIrrigationStatus(irrigationRes.value.data.irrigation);
      }

      if (alertsRes.status === 'fulfilled') {
        setAlerts(alertsRes.value.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch data');
    }
  };

  const startManualIrrigation = async () => {
    setLoading(true);
    try {
      await axios.post('http://localhost:3005/api/irrigation/manual', {
        duration: 300, // 5 minutes
        device_id: 'manual_control'
      });
      await fetchData();
    } catch (error) {
      setError('Failed to start manual irrigation');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Decision Engine & Irrigation Control
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, 
        gap: 3,
        mb: 3
      }}>
        {/* Irrigation Status */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <IrrigationIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Irrigation Status
            </Typography>
            
            {irrigationStatus ? (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Chip
                    label={irrigationStatus.isRunning ? 'Running' : 'Stopped'}
                    color={irrigationStatus.isRunning ? 'success' : 'default'}
                    sx={{ mr: 2 }}
                  />
                  {irrigationStatus.isRunning && (
                    <Typography variant="body2" color="text.secondary">
                      Device: {irrigationStatus.currentDevice}
                    </Typography>
                  )}
                </Box>

                {irrigationStatus.isRunning && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      Progress: {Math.max(0, irrigationStatus.duration - irrigationStatus.remainingTime)}s / {irrigationStatus.duration}s
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={((irrigationStatus.duration - irrigationStatus.remainingTime) / irrigationStatus.duration) * 100}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                )}

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<PlayIcon />}
                  onClick={startManualIrrigation}
                  disabled={loading || irrigationStatus?.isRunning}
                  fullWidth
                >
                  Start Manual Irrigation
                </Button>
              </Box>
            ) : (
              <Typography color="text.secondary">
                Loading irrigation status...
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Recent Decisions */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <DecisionIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Recent Decisions
            </Typography>
            
            {decisions.length > 0 ? (
              <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Action</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {decisions.slice(0, 5).map((decision) => (
                      <TableRow key={decision.id}>
                        <TableCell>
                          <Typography variant="body2">
                            {decision.action}
                            {decision.duration && ` (${decision.duration}s)`}
                            {decision.amount && ` (${decision.amount}ml)`}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={decision.priority}
                            color={getPriorityColor(decision.priority) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={decision.executed ? 'Executed' : 'Pending'}
                            color={decision.executed ? 'success' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {new Date(decision.timestamp).toLocaleTimeString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary">
                No recent decisions
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Recent Alerts */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Recent Alerts
          </Typography>
          
          {alerts.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {alerts.slice(0, 10).map((alert) => (
                <Alert
                  key={alert.id}
                  severity={getAlertColor(alert.type) as any}
                  sx={{ mb: 1 }}
                >
                  <Typography variant="body2">
                    <strong>{alert.message}</strong>
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      Device: {alert.device_id} | Value: {alert.value} | Threshold: {alert.threshold}
                    </Typography>
                  </Typography>
                </Alert>
              ))}
            </Box>
          ) : (
            <Typography color="text.secondary">
              No recent alerts
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default DecisionControl;
