const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
require('dotenv').config();

const AuthService = require('./auth');
const UserManagement = require('./user-management');
const SecurityMiddleware = require('./security-middleware');

const app = express();
const port = 3001;

// MongoDB connection
const connectToMongoDB = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_agriculture';
  
  if (!process.env.MONGODB_URI) {
    console.warn('⚠️ No MONGODB_URI environment variable found, using local MongoDB');
  }
  
  await mongoose.connect(mongoUri);
  console.log('✅ Auth Service connected to MongoDB:', mongoUri.includes('mongodb+srv') ? 'Atlas (Cloud)' : 'Local');
};

// Initialize services
const authService = new AuthService();
const userManagement = new UserManagement();
const securityMiddleware = new SecurityMiddleware();

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(securityMiddleware.setSecurityHeaders);
app.use(securityMiddleware.createRequestSizeLimit('10mb'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 auth requests per windowMs (increased for development)
    message: {
        error: 'Too many authentication attempts',
        code: 'AUTH_RATE_LIMIT_EXCEEDED'
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'auth-service',
        version: '1.0.0'
    });
});

// User registration
app.post('/api/auth/register', 
    authLimiter,
    [
        body('username').isLength({ min: 3, max: 30 }).trim().escape(),
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 6 }),
        body('role').optional().isIn(['admin', 'farmer', 'viewer'])
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const userData = securityMiddleware.preventXSS(req.body);
            const user = await userManagement.registerUser(userData);
            
            securityMiddleware.logSecurityEvent('user_registration', {
                username: user.username,
                role: user.role,
                ip: req.ip
            });

            res.status(201).json({
                message: 'User registered successfully',
                user: user
            });
        } catch (error) {
            securityMiddleware.logSecurityEvent('registration_failure', {
                error: error.message,
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.status(400).json({
                error: error.message,
                code: 'REGISTRATION_FAILED'
            });
        }
    }
);

// User login
app.post('/api/auth/login',
    authLimiter,
    [
        body('username').notEmpty().trim().escape(),
        body('password').notEmpty()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const credentials = securityMiddleware.preventXSS(req.body);
            const result = await userManagement.loginUser(credentials);
            
            securityMiddleware.logSecurityEvent('login_success', {
                username: result.user.username,
                role: result.user.role,
                ip: req.ip
            });

            res.json({
                message: 'Login successful',
                ...result
            });
        } catch (error) {
            securityMiddleware.logSecurityEvent('login_failure', {
                error: error.message,
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.status(401).json({
                error: 'Invalid credentials',
                code: 'LOGIN_FAILED'
            });
        }
    }
);

// Device registration
app.post('/api/devices/register',
    authService.authenticateToken,
    securityMiddleware.validateApiKey,
    [
        body('deviceId').isLength({ min: 3, max: 50 }).trim().escape(),
        body('deviceType').isIn(['soil_moisture', 'temperature', 'humidity', 'light', 'irrigation_controller']),
        body('location').optional().isObject()
    ],
    (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const deviceData = securityMiddleware.preventXSS(req.body);
            deviceData.ownerId = req.user.userId;
            
            const device = userManagement.registerDevice(deviceData);
            
            securityMiddleware.logSecurityEvent('device_registration', {
                deviceId: device.deviceId,
                deviceType: deviceData.deviceType,
                ownerId: req.user.userId,
                ip: req.ip
            });

            res.status(201).json({
                message: 'Device registered successfully',
                device: device
            });
        } catch (error) {
            securityMiddleware.logSecurityEvent('device_registration_failure', {
                error: error.message,
                deviceId: req.body.deviceId,
                ownerId: req.user.userId,
                ip: req.ip
            });

            res.status(400).json({
                error: error.message,
                code: 'DEVICE_REGISTRATION_FAILED'
            });
        }
    }
);

// Device authentication
app.post('/api/devices/authenticate',
    [
        body('deviceId').notEmpty().trim().escape(),
        body('apiKey').isLength({ min: 64, max: 64 })
    ],
    (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { deviceId, apiKey } = securityMiddleware.preventXSS(req.body);
            const device = userManagement.authenticateDevice(deviceId, apiKey);
            
            securityMiddleware.logSecurityEvent('device_authentication', {
                deviceId: deviceId,
                ip: req.ip
            });

            res.json({
                message: 'Device authenticated successfully',
                device: device
            });
        } catch (error) {
            securityMiddleware.logSecurityEvent('device_authentication_failure', {
                error: error.message,
                deviceId: req.body.deviceId,
                ip: req.ip
            });

            res.status(401).json({
                error: 'Device authentication failed',
                code: 'DEVICE_AUTH_FAILED'
            });
        }
    }
);

// Get user profile
app.get('/api/user/profile',
    authService.authenticateToken,
    (req, res) => {
        const user = userManagement.getUserById(req.user.userId);
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        res.json({
            user: user
        });
    }
);

// Get user devices
app.get('/api/user/devices',
    authService.authenticateToken,
    (req, res) => {
        const devices = userManagement.getUserDevices(req.user.userId);
        res.json({
            devices: devices
        });
    }
);

// Token refresh
app.post('/api/auth/refresh',
    [
        body('refreshToken').notEmpty()
    ],
    (req, res) => {
        try {
            const { refreshToken } = req.body;
            // In a real implementation, validate refresh token against stored sessions
            // For this simulation, we'll generate a new token
            
            const newToken = authService.generateToken({
                userId: 'user_id', // Get from refresh token validation
                username: 'username',
                role: 'farmer',
                permissions: ['read:own_data', 'write:own_data']
            });

            res.json({
                accessToken: newToken,
                message: 'Token refreshed successfully'
            });
        } catch (error) {
            res.status(401).json({
                error: 'Invalid refresh token',
                code: 'INVALID_REFRESH_TOKEN'
            });
        }
    }
);

// Logout
app.post('/api/auth/logout',
    authService.authenticateToken,
    (req, res) => {
        // In a real implementation, invalidate the token
        securityMiddleware.logSecurityEvent('user_logout', {
            userId: req.user.userId,
            ip: req.ip
        });

        res.json({
            message: 'Logged out successfully'
        });
    }
);

// Security audit endpoint (admin only)
app.get('/api/admin/security-audit',
    authService.authenticateToken,
    (req, res) => {
        // Check if user has admin permissions
        if (!userManagement.hasPermission(req.user, 'manage:system')) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                code: 'INSUFFICIENT_PERMISSIONS'
            });
        }

        // Return security audit information
        res.json({
            activeUsers: userManagement.users.size,
            activeDevices: userManagement.devices.size,
            activeSessions: userManagement.sessions.size,
            securityEvents: 'Check logs for security events',
            lastAudit: new Date().toISOString()
        });
    }
);

// Error handling middleware
app.use((error, req, res, next) => {
    securityMiddleware.logSecurityEvent('server_error', {
        error: error.message,
        stack: error.stack,
        ip: req.ip,
        endpoint: req.path
    });

    res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
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
const startServer = async () => {
  try {
    await connectToMongoDB();
    
    app.listen(port, () => {
        console.log(`listening on port ${port}`);
        
        // Clean up expired sessions every hour
        setInterval(() => {
            userManagement.cleanupExpiredSessions();
        }, 60 * 60 * 1000);
    });
  } catch (error) {
    console.error('❌ Failed to start auth service:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
