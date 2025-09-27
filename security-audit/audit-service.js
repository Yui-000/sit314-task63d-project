const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SecurityAuditService {
    constructor() {
        this.auditLogPath = process.env.AUDIT_LOG_PATH || './logs/security-audit.log';
        this.auditEvents = [];
        this.threatLevels = {
            'low': 1,
            'medium': 2,
            'high': 3,
            'critical': 4
        };
        
        this.ensureLogDirectory();
        this.initializeSampleData();
    }

    ensureLogDirectory() {
        const logDir = path.dirname(this.auditLogPath);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    initializeSampleData() {
        // Add some sample security events for demonstration
        const sampleEvents = [
            {
                type: 'authentication_failure',
                severity: 'medium',
                source: 'auth-service',
                details: { attempts: 3, username: 'admin' },
                ip: '192.168.1.100',
                deviceId: 'sensor_001'
            },
            {
                type: 'suspicious_activity',
                severity: 'high',
                source: 'sensor-monitor',
                details: { pattern: 'unusual_data_spike', sensor: 'temperature' },
                ip: '192.168.1.105',
                deviceId: 'sensor_002'
            },
            {
                type: 'encryption_key_rotation',
                severity: 'low',
                source: 'encryption-service',
                details: { keyId: 'key_001', algorithm: 'AES-256' },
                ip: 'internal',
                deviceId: 'system'
            },
            {
                type: 'unauthorized_access_attempt',
                severity: 'critical',
                source: 'api-gateway',
                details: { endpoint: '/api/sensors/control', method: 'POST' },
                ip: '203.0.113.42',
                deviceId: 'external'
            },
            {
                type: 'system_health_check',
                severity: 'low',
                source: 'health-monitor',
                details: { status: 'healthy', uptime: '99.9%' },
                ip: 'internal',
                deviceId: 'system'
            }
        ];

        // Add sample events to the audit log
        sampleEvents.forEach(event => {
            this.logSecurityEvent(event);
        });

        console.log('📊 Sample security events initialized');
    }

    // Log security event
    logSecurityEvent(event) {
        const auditEntry = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            event: event.type,
            severity: event.severity || 'medium',
            source: event.source || 'unknown',
            details: event.details || {},
            ip: event.ip || 'unknown',
            userAgent: event.userAgent || 'unknown',
            userId: event.userId || null,
            deviceId: event.deviceId || null,
            riskScore: this.calculateRiskScore(event),
            action: event.action || 'logged',
            status: 'active'
        };

        this.auditEvents.push(auditEntry);
        this.writeToLogFile(auditEntry);
        this.checkForThreats(auditEntry);

        return auditEntry;
    }

    // Calculate risk score for an event
    calculateRiskScore(event) {
        let score = 0;
        
        // Base score from severity
        score += this.threatLevels[event.severity] || 1;
        
        // Additional scoring factors
        if (event.type === 'login_failure') score += 2;
        if (event.type === 'invalid_token') score += 3;
        if (event.type === 'rate_limit_exceeded') score += 2;
        if (event.type === 'suspicious_activity') score += 5;
        if (event.type === 'data_breach_attempt') score += 10;
        if (event.type === 'unauthorized_access') score += 8;
        
        // IP-based scoring
        if (this.isSuspiciousIP(event.ip)) score += 3;
        
        // Time-based scoring (off-hours activity)
        const hour = new Date().getHours();
        if (hour < 6 || hour > 22) score += 2;
        
        return Math.min(score, 20); // Cap at 20
    }

    // Check if IP is suspicious
    isSuspiciousIP(ip) {
        // In production, integrate with threat intelligence feeds
        const suspiciousIPs = [
            '192.168.1.100', // Example suspicious IP
            '10.0.0.50'       // Example suspicious IP
        ];
        
        return suspiciousIPs.includes(ip);
    }

    // Check for potential threats
    checkForThreats(auditEntry) {
        const recentEvents = this.getRecentEvents(15); // Last 15 minutes
        const highRiskEvents = recentEvents.filter(e => e.riskScore >= 8);
        
        if (highRiskEvents.length >= 3) {
            this.triggerSecurityAlert('multiple_high_risk_events', {
                count: highRiskEvents.length,
                events: highRiskEvents.map(e => e.id),
                timeWindow: '15 minutes'
            });
        }
        
        // Check for brute force attacks
        const loginFailures = recentEvents.filter(e => e.event === 'login_failure');
        if (loginFailures.length >= 5) {
            this.triggerSecurityAlert('brute_force_attack', {
                count: loginFailures.length,
                timeWindow: '15 minutes',
                ips: [...new Set(loginFailures.map(e => e.ip))]
            });
        }
        
        // Check for unusual API usage patterns
        const apiEvents = recentEvents.filter(e => e.event === 'api_access');
        if (apiEvents.length >= 100) {
            this.triggerSecurityAlert('unusual_api_usage', {
                count: apiEvents.length,
                timeWindow: '15 minutes'
            });
        }
    }

    // Trigger security alert
    triggerSecurityAlert(alertType, details) {
        const alert = {
            id: crypto.randomUUID(),
            type: alertType,
            timestamp: new Date().toISOString(),
            severity: 'high',
            details: details,
            status: 'active',
            actions: this.getRecommendedActions(alertType)
        };

        console.error(`[SECURITY ALERT] ${alertType.toUpperCase()}:`, alert);
        
        // In production, send to security team, SIEM, etc.
        this.sendSecurityNotification(alert);
        
        return alert;
    }

    // Get recommended actions for security alerts
    getRecommendedActions(alertType) {
        const actionMap = {
            'multiple_high_risk_events': [
                'Review recent security events',
                'Check system logs for anomalies',
                'Consider increasing monitoring'
            ],
            'brute_force_attack': [
                'Block suspicious IP addresses',
                'Implement account lockout policies',
                'Review authentication logs'
            ],
            'unusual_api_usage': [
                'Check for API abuse',
                'Review rate limiting settings',
                'Monitor for DDoS attacks'
            ]
        };
        
        return actionMap[alertType] || ['Investigate the security event'];
    }

    // Send security notification
    sendSecurityNotification(alert) {
        // In production, integrate with notification systems
        // For this simulation, we'll log to console and file
        
        const notification = {
            alert: alert,
            timestamp: new Date().toISOString(),
            recipients: ['security-team@company.com'],
            channels: ['email', 'slack', 'sms']
        };
        
        console.log(`[SECURITY NOTIFICATION] ${JSON.stringify(notification)}`);
    }

    // Write audit entry to log file
    writeToLogFile(auditEntry) {
        const logLine = JSON.stringify(auditEntry) + '\n';
        
        try {
            fs.appendFileSync(this.auditLogPath, logLine);
        } catch (error) {
            console.error('Failed to write to audit log:', error);
        }
    }

    // Get recent events
    getRecentEvents(minutes = 60) {
        const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
        return this.auditEvents.filter(event => 
            new Date(event.timestamp) > cutoffTime
        );
    }

    // Generate security report
    generateSecurityReport(timeframe = '24h') {
        const hours = timeframe === '24h' ? 24 : 
                     timeframe === '7d' ? 168 : 
                     timeframe === '30d' ? 720 : 24;
        
        const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
        const recentEvents = this.auditEvents.filter(event => 
            new Date(event.timestamp) > cutoffTime
        );

        const report = {
            timeframe: timeframe,
            generatedAt: new Date().toISOString(),
            totalEvents: recentEvents.length,
            eventsBySeverity: this.groupEventsBySeverity(recentEvents),
            eventsByType: this.groupEventsByType(recentEvents),
            topThreats: this.getTopThreats(recentEvents),
            riskScore: this.calculateOverallRiskScore(recentEvents),
            recommendations: this.generateRecommendations(recentEvents)
        };

        return report;
    }

    // Group events by severity
    groupEventsBySeverity(events) {
        const groups = {};
        events.forEach(event => {
            groups[event.severity] = (groups[event.severity] || 0) + 1;
        });
        return groups;
    }

    // Group events by type
    groupEventsByType(events) {
        const groups = {};
        events.forEach(event => {
            groups[event.event] = (groups[event.event] || 0) + 1;
        });
        return groups;
    }

    // Get top threats
    getTopThreats(events) {
        return events
            .filter(event => event.riskScore >= 5)
            .sort((a, b) => b.riskScore - a.riskScore)
            .slice(0, 10)
            .map(event => ({
                id: event.id,
                type: event.event,
                severity: event.severity,
                riskScore: event.riskScore,
                timestamp: event.timestamp,
                details: event.details
            }));
    }

    // Calculate overall risk score
    calculateOverallRiskScore(events) {
        if (events.length === 0) return 0;
        
        const totalScore = events.reduce((sum, event) => sum + event.riskScore, 0);
        return Math.round(totalScore / events.length * 10) / 10;
    }

    // Generate security recommendations
    generateRecommendations(events) {
        const recommendations = [];
        
        const highRiskEvents = events.filter(e => e.riskScore >= 8);
        if (highRiskEvents.length > 0) {
            recommendations.push({
                priority: 'high',
                category: 'threat_detection',
                recommendation: 'Investigate high-risk security events immediately',
                count: highRiskEvents.length
            });
        }
        
        const loginFailures = events.filter(e => e.event === 'login_failure');
        if (loginFailures.length > 10) {
            recommendations.push({
                priority: 'medium',
                category: 'authentication',
                recommendation: 'Review and strengthen authentication policies',
                count: loginFailures.length
            });
        }
        
        const apiAbuse = events.filter(e => e.event === 'rate_limit_exceeded');
        if (apiAbuse.length > 5) {
            recommendations.push({
                priority: 'medium',
                category: 'api_security',
                recommendation: 'Review API rate limiting and implement stricter controls',
                count: apiAbuse.length
            });
        }
        
        return recommendations;
    }

    // Perform security scan
    performSecurityScan() {
        const scanResults = {
            timestamp: new Date().toISOString(),
            vulnerabilities: [],
            recommendations: [],
            score: 100
        };

        // Check for common vulnerabilities
        this.checkAuthenticationVulnerabilities(scanResults);
        this.checkDataEncryption(scanResults);
        this.checkAPISecurity(scanResults);
        this.checkLoggingSecurity(scanResults);

        return scanResults;
    }

    // Check authentication vulnerabilities
    checkAuthenticationVulnerabilities(scanResults) {
        // Check for weak passwords in recent registrations
        const recentRegistrations = this.auditEvents.filter(e => 
            e.event === 'user_registration' && 
            new Date(e.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        );

        if (recentRegistrations.length > 0) {
            scanResults.vulnerabilities.push({
                type: 'authentication',
                severity: 'medium',
                description: 'Recent user registrations detected - verify password policies',
                count: recentRegistrations.length
            });
            scanResults.score -= 10;
        }
    }

    // Check data encryption
    checkDataEncryption(scanResults) {
        // In a real implementation, check if sensitive data is properly encrypted
        scanResults.recommendations.push({
            type: 'encryption',
            description: 'Ensure all sensitive data is encrypted at rest and in transit',
            priority: 'high'
        });
    }

    // Check API security
    checkAPISecurity(scanResults) {
        const apiEvents = this.auditEvents.filter(e => e.event === 'api_access');
        const unauthorizedAccess = apiEvents.filter(e => e.details.statusCode === 401);
        
        if (unauthorizedAccess.length > 0) {
            scanResults.vulnerabilities.push({
                type: 'api_security',
                severity: 'high',
                description: 'Unauthorized API access attempts detected',
                count: unauthorizedAccess.length
            });
            scanResults.score -= 15;
        }
    }

    // Check logging security
    checkLoggingSecurity(scanResults) {
        // Check if audit logs are being generated properly
        const recentLogs = this.getRecentEvents(60);
        if (recentLogs.length === 0) {
            scanResults.vulnerabilities.push({
                type: 'logging',
                severity: 'high',
                description: 'No recent audit logs detected - check logging system',
                count: 0
            });
            scanResults.score -= 20;
        }
    }

    // Export audit data
    exportAuditData(format = 'json', timeframe = '7d') {
        const hours = timeframe === '24h' ? 24 : 
                     timeframe === '7d' ? 168 : 
                     timeframe === '30d' ? 720 : 168;
        
        const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
        const events = this.auditEvents.filter(event => 
            new Date(event.timestamp) > cutoffTime
        );

        if (format === 'json') {
            return JSON.stringify(events, null, 2);
        } else if (format === 'csv') {
            return this.convertToCSV(events);
        }

        return events;
    }

    // Convert events to CSV format
    convertToCSV(events) {
        if (events.length === 0) return '';
        
        const headers = Object.keys(events[0]).join(',');
        const rows = events.map(event => 
            Object.values(event).map(value => 
                typeof value === 'object' ? JSON.stringify(value) : value
            ).join(',')
        );
        
        return [headers, ...rows].join('\n');
    }
}

module.exports = SecurityAuditService;
