const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const SecurityAuditService = require('./audit-service');

const app = express();
const PORT = process.env.PORT || 3003;

// Initialize audit service
const auditService = new SecurityAuditService();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'security-audit-service',
        version: '1.0.0'
    });
});

// Log security event
app.post('/api/events/log', (req, res) => {
    try {
        const event = req.body;
        
        if (!event.type) {
            return res.status(400).json({
                error: 'Event type is required',
                code: 'MISSING_EVENT_TYPE'
            });
        }

        const auditEntry = auditService.logSecurityEvent(event);
        
        res.json({
            success: true,
            eventId: auditEntry.id,
            message: 'Security event logged successfully'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Event logging failed',
            code: 'LOGGING_ERROR',
            details: error.message
        });
    }
});

// Get recent events
app.get('/api/events/recent', (req, res) => {
    try {
        const { minutes = 60 } = req.query;
        const events = auditService.getRecentEvents(parseInt(minutes));
        
        res.json({
            success: true,
            events: events,
            count: events.length,
            timeWindow: `${minutes} minutes`
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to retrieve recent events',
            code: 'EVENTS_RETRIEVAL_ERROR',
            details: error.message
        });
    }
});

// Generate security report
app.get('/api/reports/security', (req, res) => {
    try {
        const { timeframe = '24h' } = req.query;
        const report = auditService.generateSecurityReport(timeframe);
        
        res.json({
            success: true,
            report: report,
            message: 'Security report generated successfully'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Report generation failed',
            code: 'REPORT_GENERATION_ERROR',
            details: error.message
        });
    }
});

// Perform security scan
app.post('/api/scan/security', (req, res) => {
    try {
        const scanResults = auditService.performSecurityScan();
        
        res.json({
            success: true,
            scanResults: scanResults,
            message: 'Security scan completed successfully'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Security scan failed',
            code: 'SCAN_ERROR',
            details: error.message
        });
    }
});

// Export audit data
app.get('/api/export/audit', (req, res) => {
    try {
        const { format = 'json', timeframe = '7d' } = req.query;
        const data = auditService.exportAuditData(format, timeframe);
        
        res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="audit-data-${Date.now()}.${format}"`);
        
        res.send(data);
    } catch (error) {
        res.status(500).json({
            error: 'Data export failed',
            code: 'EXPORT_ERROR',
            details: error.message
        });
    }
});

// Get security metrics
app.get('/api/metrics/security', (req, res) => {
    try {
        const recentEvents = auditService.getRecentEvents(60); // Last hour
        const highRiskEvents = recentEvents.filter(e => e.riskScore >= 8);
        const criticalEvents = recentEvents.filter(e => e.severity === 'critical');
        
        const metrics = {
            totalEvents: recentEvents.length,
            highRiskEvents: highRiskEvents.length,
            criticalEvents: criticalEvents.length,
            averageRiskScore: recentEvents.length > 0 ? 
                (recentEvents.reduce((sum, e) => sum + e.riskScore, 0) / recentEvents.length).toFixed(2) : 0,
            eventsBySeverity: auditService.groupEventsBySeverity(recentEvents),
            topThreats: auditService.getTopThreats(recentEvents).slice(0, 5)
        };
        
        res.json({
            success: true,
            metrics: metrics,
            message: 'Security metrics retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Metrics retrieval failed',
            code: 'METRICS_ERROR',
            details: error.message
        });
    }
});

// Get threat analysis
app.get('/api/analysis/threats', (req, res) => {
    try {
        const { hours = 24 } = req.query;
        const recentEvents = auditService.getRecentEvents(parseInt(hours) * 60);
        
        const analysis = {
            timeWindow: `${hours} hours`,
            totalEvents: recentEvents.length,
            threatLevel: this.calculateThreatLevel(recentEvents),
            recommendations: auditService.generateRecommendations(recentEvents),
            topThreats: auditService.getTopThreats(recentEvents),
            riskTrend: this.calculateRiskTrend(recentEvents)
        };
        
        res.json({
            success: true,
            analysis: analysis,
            message: 'Threat analysis completed successfully'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Threat analysis failed',
            code: 'ANALYSIS_ERROR',
            details: error.message
        });
    }
});

// Helper function to calculate threat level
function calculateThreatLevel(events) {
    if (events.length === 0) return 'low';
    
    const highRiskCount = events.filter(e => e.riskScore >= 8).length;
    const criticalCount = events.filter(e => e.severity === 'critical').length;
    
    if (criticalCount > 0) return 'critical';
    if (highRiskCount > 5) return 'high';
    if (highRiskCount > 2) return 'medium';
    return 'low';
}

// Helper function to calculate risk trend
function calculateRiskTrend(events) {
    if (events.length < 2) return 'stable';
    
    const sortedEvents = events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const firstHalf = sortedEvents.slice(0, Math.floor(sortedEvents.length / 2));
    const secondHalf = sortedEvents.slice(Math.floor(sortedEvents.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, e) => sum + e.riskScore, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, e) => sum + e.riskScore, 0) / secondHalf.length;
    
    if (secondHalfAvg > firstHalfAvg * 1.2) return 'increasing';
    if (secondHalfAvg < firstHalfAvg * 0.8) return 'decreasing';
    return 'stable';
}

// Get security dashboard data
app.get('/api/dashboard', (req, res) => {
    try {
        const recentEvents = auditService.getRecentEvents(24 * 60); // Last 24 hours
        const hourlyEvents = this.groupEventsByHour(recentEvents);
        const severityDistribution = auditService.groupEventsBySeverity(recentEvents);
        const topThreats = auditService.getTopThreats(recentEvents).slice(0, 10);
        
        const dashboard = {
            summary: {
                totalEvents: recentEvents.length,
                highRiskEvents: recentEvents.filter(e => e.riskScore >= 8).length,
                criticalEvents: recentEvents.filter(e => e.severity === 'critical').length,
                averageRiskScore: recentEvents.length > 0 ? 
                    (recentEvents.reduce((sum, e) => sum + e.riskScore, 0) / recentEvents.length).toFixed(2) : 0
            },
            hourlyEvents: hourlyEvents,
            severityDistribution: severityDistribution,
            topThreats: topThreats,
            recommendations: auditService.generateRecommendations(recentEvents)
        };
        
        res.json({
            success: true,
            dashboard: dashboard,
            message: 'Dashboard data retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Dashboard data retrieval failed',
            code: 'DASHBOARD_ERROR',
            details: error.message
        });
    }
});

// Helper function to group events by hour
function groupEventsByHour(events) {
    const hourlyGroups = {};
    
    events.forEach(event => {
        const hour = new Date(event.timestamp).getHours();
        if (!hourlyGroups[hour]) {
            hourlyGroups[hour] = 0;
        }
        hourlyGroups[hour]++;
    });
    
    return hourlyGroups;
}

// Error handling middleware
app.use((error, req, res, next) => {
    res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        code: 'NOT_FOUND'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Security audit service running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
