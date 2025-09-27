const AuthService = require('./auth');
const crypto = require('crypto');
const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'farmer' },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },
    permissions: [String],
    createdAt: { type: Date, default: Date.now }
});

// Device Schema
const deviceSchema = new mongoose.Schema({
    deviceId: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    location: { type: String, default: null },
    ownerId: { type: String, required: true },
    apiKey: { type: String, required: true },
    certificate: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    registeredAt: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: null },
    status: { type: String, default: 'offline' }
});

// Session Schema
const sessionSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Device = mongoose.model('Device', deviceSchema);
const Session = mongoose.model('Session', sessionSchema);

class UserManagement {
    constructor() {
        this.authService = new AuthService();
    }

    // User registration
    async registerUser(userData) {
        const { username, email, password, role = 'farmer' } = userData;
        
        // Validate input
        if (!username || !email || !password) {
            throw new Error('Username, email, and password are required');
        }
        
        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ username }, { email }] 
        });
        if (existingUser) {
            throw new Error('User already exists');
        }
        
        // Hash password
        const hashedPassword = await this.authService.hashPassword(password);
        
        // Create user
        const user = new User({
            username,
            email,
            password: hashedPassword,
            role,
            permissions: this.getRolePermissions(role)
        });
        
        await user.save();
        
        return {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt
        };
    }

    // User login
    async loginUser(credentials) {
        const { username, password } = credentials;
        
        const user = await User.findOne({ username });
        if (!user) {
            throw new Error('Invalid credentials');
        }
        
        if (!user.isActive) {
            throw new Error('Account is deactivated');
        }
        
        const isValidPassword = await this.authService.verifyPassword(password, user.password);
        if (!isValidPassword) {
            throw new Error('Invalid credentials');
        }
        
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        
        // Generate tokens
        const tokenPayload = {
            userId: user._id,
            username: user.username,
            role: user.role,
            permissions: user.permissions
        };
        
        const accessToken = this.authService.generateToken(tokenPayload);
        const refreshTokenData = this.authService.generateRefreshToken(user._id);
        
        // Store session
        const session = new Session({
            userId: user._id,
            accessToken,
            refreshToken: refreshTokenData.token,
            expiresAt: refreshTokenData.expiresAt
        });
        await session.save();
        
        return {
            accessToken,
            refreshToken: refreshTokenData.token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                permissions: user.permissions
            }
        };
    }

    // Device registration
    async registerDevice(deviceData) {
        const { deviceId, deviceType, location, ownerId } = deviceData;
        
        if (!deviceId || !deviceType || !ownerId) {
            throw new Error('Device ID, type, and owner are required');
        }
        
        // Check if device already exists
        const existingDevice = await Device.findOne({ deviceId });
        if (existingDevice) {
            throw new Error('Device already exists');
        }
        
        // Generate API key and certificate
        const apiKeyData = this.authService.generateApiKey(deviceId);
        const deviceCertificate = this.authService.generateDeviceCertificate(deviceId);
        
        const device = new Device({
            deviceId,
            type: deviceType,
            location: location || null,
            ownerId,
            apiKey: apiKeyData.hashedKey,
            certificate: deviceCertificate
        });
        
        await device.save();
        
        return {
            deviceId: device.deviceId,
            apiKey: apiKeyData.key, // Only returned once
            certificate: device.certificate,
            mqttTopics: {
                publish: `sensors/${deviceId}/+`,
                subscribe: `control/${deviceId}/+`
            }
        };
    }

    // Device authentication
    async authenticateDevice(deviceId, apiKey) {
        const device = await Device.findOne({ deviceId });
        if (!device || !device.isActive) {
            throw new Error('Device not found or inactive');
        }
        
        const isValidKey = this.authService.verifyApiKey(apiKey, device.apiKey);
        if (!isValidKey) {
            throw new Error('Invalid API key');
        }
        
        // Update last seen
        device.lastSeen = new Date();
        device.status = 'online';
        await device.save();
        
        return {
            deviceId: device.deviceId,
            type: device.type,
            permissions: ['publish', 'subscribe'],
            topics: {
                publish: `sensors/${deviceId}/+`,
                subscribe: `control/${deviceId}/+`
            }
        };
    }

    // Get role permissions
    getRolePermissions(role) {
        const permissions = {
            'admin': [
                'read:all_data',
                'write:all_data',
                'manage:users',
                'manage:devices',
                'manage:system',
                'view:analytics',
                'control:irrigation',
                'control:fertilization'
            ],
            'farmer': [
                'read:own_data',
                'write:own_data',
                'manage:own_devices',
                'view:own_analytics',
                'control:own_irrigation',
                'control:own_fertilization'
            ],
            'viewer': [
                'read:own_data',
                'view:own_analytics'
            ]
        };
        
        return permissions[role] || permissions['viewer'];
    }

    // Check user permissions
    hasPermission(user, permission) {
        if (!user || !user.permissions) {
            return false;
        }
        
        return user.permissions.includes(permission) || user.permissions.includes('admin');
    }

    // Get user by ID
    async getUserById(userId) {
        const user = await User.findById(userId);
        if (!user) {
            return null;
        }
        
        return {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            permissions: user.permissions,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
            isActive: user.isActive
        };
    }

    // Get device by ID
    async getDeviceById(deviceId) {
        const device = await Device.findOne({ deviceId });
        if (!device) {
            return null;
        }
        
        return {
            id: device.deviceId,
            type: device.type,
            location: device.location,
            ownerId: device.ownerId,
            isActive: device.isActive,
            registeredAt: device.registeredAt,
            lastSeen: device.lastSeen,
            status: device.status
        };
    }

    // List user's devices
    async getUserDevices(userId) {
        const devices = await Device.find({ ownerId: userId });
        return devices.map(device => ({
            id: device.deviceId,
            type: device.type,
            location: device.location,
            status: device.status,
            lastSeen: device.lastSeen
        }));
    }

    // Deactivate user
    async deactivateUser(userId) {
        const user = await User.findById(userId);
        if (user) {
            user.isActive = false;
            await user.save();
            // Remove active sessions
            await Session.deleteMany({ userId });
            return true;
        }
        return false;
    }

    // Deactivate device
    async deactivateDevice(deviceId) {
        const device = await Device.findOne({ deviceId });
        if (device) {
            device.isActive = false;
            device.status = 'offline';
            await device.save();
            return true;
        }
        return false;
    }

    // Clean up expired sessions
    async cleanupExpiredSessions() {
        const now = new Date();
        await Session.deleteMany({ expiresAt: { $lt: now } });
    }
}

module.exports = UserManagement;
