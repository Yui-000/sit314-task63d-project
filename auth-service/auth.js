const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class AuthService {
    constructor() {
        this.secretKey = process.env.JWT_SECRET || 'your-secret-key';
        this.tokenExpiry = '24h';
        this.refreshTokenExpiry = '7d';
    }

    // Generate JWT token
    generateToken(payload) {
        return jwt.sign(payload, this.secretKey, { 
            expiresIn: this.tokenExpiry,
            issuer: 'smart-agriculture-iot',
            audience: 'agricultural-management-system'
        });
    }

    // Generate refresh token
    generateRefreshToken(userId) {
        const refreshToken = crypto.randomBytes(64).toString('hex');
        return {
            token: refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        };
    }

    // Verify JWT token
    verifyToken(token) {
        try {
            return jwt.verify(token, this.secretKey);
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }

    // Hash password
    async hashPassword(password) {
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    }

    // Verify password
    async verifyPassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }

    // Generate API key for device authentication
    generateApiKey(deviceId) {
        const apiKey = crypto.randomBytes(32).toString('hex');
        const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
        return {
            key: apiKey,
            hashedKey: hashedKey,
            deviceId: deviceId,
            createdAt: new Date()
        };
    }

    // Verify API key
    verifyApiKey(apiKey, storedHashedKey) {
        const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
        return hashedKey === storedHashedKey;
    }

    // Generate device certificate for MQTT authentication
    generateDeviceCertificate(deviceId) {
        const certData = {
            deviceId: deviceId,
            issuedAt: new Date(),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            permissions: ['publish', 'subscribe'],
            topics: [`sensors/${deviceId}/*`, `control/${deviceId}/*`]
        };
        
        return jwt.sign(certData, this.secretKey, { 
            expiresIn: '365d',
            issuer: 'smart-agriculture-iot',
            subject: deviceId
        });
    }

    // Middleware for API authentication
    authenticateToken(req, res, next) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ 
                error: 'Access token required',
                code: 'MISSING_TOKEN'
            });
        }

        try {
            const decoded = this.verifyToken(token);
            req.user = decoded;
            next();
        } catch (error) {
            return res.status(403).json({ 
                error: 'Invalid or expired token',
                code: 'INVALID_TOKEN'
            });
        }
    }

    // Middleware for device authentication
    authenticateDevice(req, res, next) {
        const apiKey = req.headers['x-api-key'];
        
        if (!apiKey) {
            return res.status(401).json({ 
                error: 'API key required',
                code: 'MISSING_API_KEY'
            });
        }

        // In a real implementation, you would check against stored API keys
        // For this simulation, we'll validate the format
        if (apiKey.length !== 64) {
            return res.status(403).json({ 
                error: 'Invalid API key format',
                code: 'INVALID_API_KEY'
            });
        }

        req.device = { apiKey: apiKey };
        next();
    }

    // Rate limiting middleware
    createRateLimiter(maxRequests = 100, windowMs = 15 * 60 * 1000) {
        const requests = new Map();
        
        return (req, res, next) => {
            const key = req.ip || req.connection.remoteAddress;
            const now = Date.now();
            const windowStart = now - windowMs;
            
            // Clean old entries
            if (requests.has(key)) {
                const userRequests = requests.get(key).filter(time => time > windowStart);
                requests.set(key, userRequests);
            } else {
                requests.set(key, []);
            }
            
            const userRequests = requests.get(key);
            
            if (userRequests.length >= maxRequests) {
                return res.status(429).json({
                    error: 'Too many requests',
                    code: 'RATE_LIMIT_EXCEEDED',
                    retryAfter: Math.ceil(windowMs / 1000)
                });
            }
            
            userRequests.push(now);
            next();
        };
    }
}

module.exports = AuthService;
