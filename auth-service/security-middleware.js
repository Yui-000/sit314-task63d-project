const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

class SecurityMiddleware {
    constructor() {
        this.encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
        this.ivLength = 16;
    }

    // Data encryption
    encryptData(data) {
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
        
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        return {
            encrypted: encrypted,
            iv: iv.toString('hex')
        };
    }

    // Data decryption
    decryptData(encryptedData, iv) {
        const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
        
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return JSON.parse(decrypted);
    }

    // Input validation and sanitization
    sanitizeInput(input) {
        if (typeof input !== 'string') {
            return input;
        }
        
        // Remove potentially dangerous characters
        return input
            .replace(/[<>]/g, '') // Remove HTML tags
            .replace(/['"]/g, '') // Remove quotes
            .replace(/[;]/g, '') // Remove semicolons
            .trim();
    }

    // SQL injection prevention
    validateSQLInput(input) {
        const dangerousPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
            /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
            /(;|\-\-|\/\*|\*\/)/i
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(input)) {
                throw new Error('Potentially malicious input detected');
            }
        }
        
        return this.sanitizeInput(input);
    }

    // XSS prevention
    preventXSS(input) {
        if (typeof input !== 'string') {
            return input;
        }
        
        return input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    // CSRF token generation
    generateCSRFToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    // CSRF token validation
    validateCSRFToken(token, sessionToken) {
        return token && sessionToken && token === sessionToken;
    }

    // Request logging for security audit
    logSecurityEvent(event, details) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event: event,
            details: details,
            severity: this.getSeverityLevel(event)
        };
        
        console.log(`[SECURITY] ${JSON.stringify(logEntry)}`);
        
        // In production, send to security monitoring system
        this.sendToSecurityMonitoring(logEntry);
    }

    getSeverityLevel(event) {
        const severityMap = {
            'login_attempt': 'info',
            'login_success': 'info',
            'login_failure': 'warning',
            'invalid_token': 'warning',
            'rate_limit_exceeded': 'warning',
            'suspicious_activity': 'error',
            'data_breach_attempt': 'critical'
        };
        
        return severityMap[event] || 'info';
    }

    sendToSecurityMonitoring(logEntry) {
        // In production, integrate with AWS CloudWatch, Splunk, or similar
        // For this simulation, we'll just log to console
        if (logEntry.severity === 'critical' || logEntry.severity === 'error') {
            console.error(`[CRITICAL SECURITY EVENT] ${JSON.stringify(logEntry)}`);
        }
    }

    // IP whitelist/blacklist management
    isIPAllowed(ip, whitelist = [], blacklist = []) {
        if (blacklist.includes(ip)) {
            return false;
        }
        
        if (whitelist.length > 0 && !whitelist.includes(ip)) {
            return false;
        }
        
        return true;
    }

    // Device fingerprinting
    generateDeviceFingerprint(req) {
        const components = [
            req.headers['user-agent'] || '',
            req.headers['accept-language'] || '',
            req.headers['accept-encoding'] || '',
            req.connection.remoteAddress || ''
        ];
        
        const fingerprint = crypto
            .createHash('sha256')
            .update(components.join('|'))
            .digest('hex');
        
        return fingerprint;
    }

    // Request size limiting
    createRequestSizeLimit(maxSize = '10mb') {
        return (req, res, next) => {
            const contentLength = parseInt(req.headers['content-length'] || '0');
            const maxSizeBytes = this.parseSize(maxSize);
            
            if (contentLength > maxSizeBytes) {
                return res.status(413).json({
                    error: 'Request entity too large',
                    code: 'REQUEST_TOO_LARGE',
                    maxSize: maxSize
                });
            }
            
            next();
        };
    }

    parseSize(size) {
        const units = {
            'b': 1,
            'kb': 1024,
            'mb': 1024 * 1024,
            'gb': 1024 * 1024 * 1024
        };
        
        const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/);
        if (!match) {
            return 10 * 1024 * 1024; // Default 10MB
        }
        
        const value = parseFloat(match[1]);
        const unit = match[2];
        
        return Math.floor(value * units[unit]);
    }

    // Security headers middleware
    setSecurityHeaders(req, res, next) {
        // Prevent clickjacking
        res.setHeader('X-Frame-Options', 'DENY');
        
        // Prevent MIME type sniffing
        res.setHeader('X-Content-Type-Options', 'nosniff');
        
        // Enable XSS protection
        res.setHeader('X-XSS-Protection', '1; mode=block');
        
        // Strict Transport Security (HTTPS only)
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        
        // Content Security Policy
        res.setHeader('Content-Security-Policy', 
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https:; " +
            "connect-src 'self' wss: ws:;"
        );
        
        // Referrer Policy
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        
        // Permissions Policy
        res.setHeader('Permissions-Policy', 
            'camera=(), microphone=(), geolocation=(), payment=()'
        );
        
        next();
    }

    // API key validation middleware
    validateApiKey(req, res, next) {
        const apiKey = req.headers['x-api-key'];
        
        if (!apiKey) {
            this.logSecurityEvent('missing_api_key', {
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                endpoint: req.path
            });
            
            return res.status(401).json({
                error: 'API key required',
                code: 'MISSING_API_KEY'
            });
        }
        
        // Validate API key format (64 character hex string)
        if (!/^[a-f0-9]{64}$/i.test(apiKey)) {
            this.logSecurityEvent('invalid_api_key_format', {
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                endpoint: req.path,
                apiKey: apiKey.substring(0, 8) + '...' // Log partial key for debugging
            });
            
            return res.status(401).json({
                error: 'Invalid API key format',
                code: 'INVALID_API_KEY_FORMAT'
            });
        }
        
        next();
    }
}

module.exports = SecurityMiddleware;
