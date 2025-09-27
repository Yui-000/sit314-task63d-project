const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const EncryptionService = require('./encryption');

const app = express();
const port = 3002;

// Initialize encryption service
const encryptionService = new EncryptionService();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'encryption-service',
        version: '1.0.0',
        encryptionStatus: encryptionService.getEncryptionStatus()
    });
});

// Encrypt sensor data
app.post('/api/encrypt/sensor-data', (req, res) => {
    try {
        const { sensorData } = req.body;
        
        if (!sensorData) {
            return res.status(400).json({
                error: 'Sensor data is required',
                code: 'MISSING_SENSOR_DATA'
            });
        }

        const encryptedData = encryptionService.encryptSensorData(sensorData);
        
        res.json({
            success: true,
            encryptedData: encryptedData,
            message: 'Sensor data encrypted successfully'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Encryption failed',
            code: 'ENCRYPTION_ERROR',
            details: error.message
        });
    }
});

// Decrypt sensor data
app.post('/api/decrypt/sensor-data', (req, res) => {
    try {
        const { encryptedData } = req.body;
        
        if (!encryptedData) {
            return res.status(400).json({
                error: 'Encrypted data is required',
                code: 'MISSING_ENCRYPTED_DATA'
            });
        }

        const decryptedData = encryptionService.decryptSensorData(encryptedData);
        
        res.json({
            success: true,
            sensorData: decryptedData,
            message: 'Sensor data decrypted successfully'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Decryption failed',
            code: 'DECRYPTION_ERROR',
            details: error.message
        });
    }
});

// Encrypt database field
app.post('/api/encrypt/field', (req, res) => {
    try {
        const { value, fieldName } = req.body;
        
        if (value === undefined || !fieldName) {
            return res.status(400).json({
                error: 'Value and field name are required',
                code: 'MISSING_PARAMETERS'
            });
        }

        const encryptedField = encryptionService.encryptDatabaseField(value, fieldName);
        
        res.json({
            success: true,
            encryptedField: encryptedField,
            message: 'Field encrypted successfully'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Field encryption failed',
            code: 'FIELD_ENCRYPTION_ERROR',
            details: error.message
        });
    }
});

// Decrypt database field
app.post('/api/decrypt/field', (req, res) => {
    try {
        const { encryptedField } = req.body;
        
        if (!encryptedField) {
            return res.status(400).json({
                error: 'Encrypted field is required',
                code: 'MISSING_ENCRYPTED_FIELD'
            });
        }

        const decryptedField = encryptionService.decryptDatabaseField(encryptedField);
        
        res.json({
            success: true,
            field: decryptedField,
            message: 'Field decrypted successfully'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Field decryption failed',
            code: 'FIELD_DECRYPTION_ERROR',
            details: error.message
        });
    }
});

// Hash sensitive data
app.post('/api/hash/data', (req, res) => {
    try {
        const { data, salt } = req.body;
        
        if (!data) {
            return res.status(400).json({
                error: 'Data is required',
                code: 'MISSING_DATA'
            });
        }

        const hashedData = encryptionService.hashSensitiveData(data, salt);
        
        res.json({
            success: true,
            hashedData: hashedData,
            message: 'Data hashed successfully'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Data hashing failed',
            code: 'HASHING_ERROR',
            details: error.message
        });
    }
});

// Verify hashed data
app.post('/api/verify/hash', (req, res) => {
    try {
        const { data, hash, salt } = req.body;
        
        if (!data || !hash || !salt) {
            return res.status(400).json({
                error: 'Data, hash, and salt are required',
                code: 'MISSING_PARAMETERS'
            });
        }

        const isValid = encryptionService.verifyHashedData(data, hash, salt);
        
        res.json({
            success: true,
            isValid: isValid,
            message: isValid ? 'Hash verification successful' : 'Hash verification failed'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Hash verification failed',
            code: 'VERIFICATION_ERROR',
            details: error.message
        });
    }
});

// Generate secure token
app.post('/api/generate/token', (req, res) => {
    try {
        const { length = 32 } = req.body;
        
        const token = encryptionService.generateSecureToken(length);
        
        res.json({
            success: true,
            token: token,
            length: length,
            message: 'Secure token generated successfully'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Token generation failed',
            code: 'TOKEN_GENERATION_ERROR',
            details: error.message
        });
    }
});

// Generate secure password
app.post('/api/generate/password', (req, res) => {
    try {
        const { length = 16 } = req.body;
        
        const password = encryptionService.generateSecurePassword(length);
        
        res.json({
            success: true,
            password: password,
            length: length,
            message: 'Secure password generated successfully'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Password generation failed',
            code: 'PASSWORD_GENERATION_ERROR',
            details: error.message
        });
    }
});

// Create encrypted backup
app.post('/api/backup/create', (req, res) => {
    try {
        const { data } = req.body;
        
        if (!data) {
            return res.status(400).json({
                error: 'Data is required for backup',
                code: 'MISSING_DATA'
            });
        }

        const encryptedBackup = encryptionService.createEncryptedBackup(data);
        
        res.json({
            success: true,
            backup: encryptedBackup,
            message: 'Encrypted backup created successfully'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Backup creation failed',
            code: 'BACKUP_CREATION_ERROR',
            details: error.message
        });
    }
});

// Restore from encrypted backup
app.post('/api/backup/restore', (req, res) => {
    try {
        const { encryptedBackup } = req.body;
        
        if (!encryptedBackup) {
            return res.status(400).json({
                error: 'Encrypted backup is required',
                code: 'MISSING_BACKUP'
            });
        }

        const restoredData = encryptionService.restoreFromEncryptedBackup(encryptedBackup);
        
        res.json({
            success: true,
            data: restoredData,
            message: 'Backup restored successfully'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Backup restoration failed',
            code: 'BACKUP_RESTORATION_ERROR',
            details: error.message
        });
    }
});

// Get encryption status
app.get('/api/status', (req, res) => {
    try {
        const status = encryptionService.getEncryptionStatus();
        
        res.json({
            success: true,
            status: status,
            message: 'Encryption status retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Status retrieval failed',
            code: 'STATUS_ERROR',
            details: error.message
        });
    }
});

// Rotate encryption keys
app.post('/api/keys/rotate', (req, res) => {
    try {
        const rotationResult = encryptionService.rotateKeys();
        
        res.json({
            success: true,
            rotation: rotationResult,
            message: 'Encryption keys rotated successfully'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Key rotation failed',
            code: 'KEY_ROTATION_ERROR',
            details: error.message
        });
    }
});

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
app.listen(port, () => {
    console.log(`listening on port ${port}`);
});

module.exports = app;
