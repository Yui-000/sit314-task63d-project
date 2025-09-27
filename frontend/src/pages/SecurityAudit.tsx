import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Button,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import axios from 'axios';

interface SecurityEvent {
  id: string;
  timestamp: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source: string;
  riskScore: number;
}

interface SecurityMetrics {
  overallScore: number;
  totalEvents: number;
  criticalEvents: number;
  highEvents: number;
  mediumEvents: number;
  lowEvents: number;
  lastScan: string;
}

const SecurityAudit: React.FC = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchSecurityData();
    // Set up real-time updates
    const interval = setInterval(fetchSecurityData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchSecurityData = async () => {
    try {
      const [eventsRes, metricsRes] = await Promise.allSettled([
        axios.get('http://localhost:3003/api/events/recent'),
        axios.get('http://localhost:3003/api/metrics/security'),
      ]);

      if (eventsRes.status === 'fulfilled') {
        setEvents(eventsRes.value.data.events || []);
      }

      if (metricsRes.status === 'fulfilled') {
        setMetrics(metricsRes.value.data);
      }
    } catch (error) {
      setError('Failed to fetch security data');
    } finally {
      setLoading(false);
    }
  };

  const runSecurityScan = async () => {
    setLoading(true);
    try {
      await axios.post('http://localhost:3003/api/scan/security');
      await fetchSecurityData();
    } catch (error) {
      setError('Failed to run security scan');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <ErrorIcon color="error" />;
      case 'high': return <WarningIcon color="warning" />;
      case 'medium': return <WarningIcon color="info" />;
      case 'low': return <CheckIcon color="success" />;
      default: return <SecurityIcon />;
    }
  };

  const pieData = metrics ? [
    { name: 'Critical', value: metrics.criticalEvents, color: '#f44336' },
    { name: 'High', value: metrics.highEvents, color: '#ff9800' },
    { name: 'Medium', value: metrics.mediumEvents, color: '#2196f3' },
    { name: 'Low', value: metrics.lowEvents, color: '#4caf50' },
  ] : [];

  const barData = events.slice(0, 10).map(event => ({
    name: event.type,
    count: 1,
    severity: event.severity,
  }));

  if (loading && !metrics) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Security Audit Dashboard
        </Typography>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={runSecurityScan}
          disabled={loading}
        >
          Run Security Scan
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Security Overview */}
        {metrics && (
          <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 1' } }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Security Overview
                </Typography>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Typography variant="h2" color="primary">
                    {metrics.overallScore}
                  </Typography>
                  <Box>
                    <Typography variant="h6">Overall Score</Typography>
                    <Typography variant="body2" color="text.secondary">
                      out of 100
                    </Typography>
                  </Box>
                </Box>
                <Alert 
                  severity={metrics.overallScore >= 90 ? 'success' : 
                           metrics.overallScore >= 70 ? 'warning' : 'error'}
                >
                  {metrics.overallScore >= 90 ? 'Excellent security posture' : 
                   metrics.overallScore >= 70 ? 'Good security, some improvements needed' : 
                   'Security issues detected - immediate attention required'}
                </Alert>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Event Distribution */}
        <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 1' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Event Distribution
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

        {/* Recent Events Table */}
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Security Events
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>Source</TableCell>
                      <TableCell>Risk Score</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id} hover>
                        <TableCell>
                          {new Date(event.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>{event.type}</TableCell>
                        <TableCell>
                          <Chip
                            icon={getSeverityIcon(event.severity)}
                            label={event.severity.toUpperCase()}
                            color={getSeverityColor(event.severity) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{event.source}</TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2">
                              {event.riskScore}/20
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={(event.riskScore / 20) * 100}
                              sx={{ width: 50, height: 6 }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {event.description}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => {
                              setSelectedEvent(event);
                              setDialogOpen(true);
                            }}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>

        {/* Event Types Chart */}
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Event Types (Last 10 Events)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2196f3" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Event Details Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Security Event Details
        </DialogTitle>
        <DialogContent>
          {selectedEvent && (
            <Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 1' } }}>
                  <Typography variant="body2" color="text.secondary">
                    Event ID
                  </Typography>
                  <Typography variant="body1">
                    {selectedEvent.id}
                  </Typography>
                </Box>
                <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 1' } }}>
                  <Typography variant="body2" color="text.secondary">
                    Timestamp
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedEvent.timestamp).toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 1' } }}>
                  <Typography variant="body2" color="text.secondary">
                    Type
                  </Typography>
                  <Typography variant="body1">
                    {selectedEvent.type}
                  </Typography>
                </Box>
                <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 1' } }}>
                  <Typography variant="body2" color="text.secondary">
                    Severity
                  </Typography>
                  <Chip
                    icon={getSeverityIcon(selectedEvent.severity)}
                    label={selectedEvent.severity.toUpperCase()}
                    color={getSeverityColor(selectedEvent.severity) as any}
                  />
                </Box>
                <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 1' } }}>
                  <Typography variant="body2" color="text.secondary">
                    Source
                  </Typography>
                  <Typography variant="body1">
                    {selectedEvent.source}
                  </Typography>
                </Box>
                <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 1' } }}>
                  <Typography variant="body2" color="text.secondary">
                    Risk Score
                  </Typography>
                  <Typography variant="body1">
                    {selectedEvent.riskScore}/20
                  </Typography>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography variant="body2" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body1">
                    {selectedEvent.description}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SecurityAudit;
