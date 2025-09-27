const crypto = require('crypto');

class EncryptionService {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.keyLength = 32; // 256 bits
        this.ivLength = 16; // 128 bits
        this.tagLength = 16; // 128 bits
        this.saltLength = 32; // 256 bits
        
        // Generate or load encryption keys
        this.masterKey = this.generateOrLoadMasterKey();
        this.dataKey = this.generateDataKey();
    }

    // Generate or load master key
    generateOrLoadMasterKey() {
        const masterKey = process.env.MASTER_ENCRYPTION_KEY;
        if (masterKey) {
            return Buffer.from(masterKey, 'hex');
        }
        
        // Generate new master key (in production, store securely)
        const newKey = crypto.randomBytes(this.keyLength);
        console.warn('WARNING: Generated new master key. Store securely in production!');
        return newKey;
    }

    // Generate data encryption key
    generateDataKey() {
        return crypto.randomBytes(this.keyLength);
    }

    // Derive key from password using PBKDF2
    deriveKeyFromPassword(password, salt) {
        return crypto.pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha512');
    }

    // Encrypt data
    encryptData(data, key = null) {
        try {
            const encryptionKey = key || this.dataKey;
            const iv = crypto.randomBytes(this.ivLength);
            const cipher = crypto.createCipher(this.algorithm, encryptionKey);
            
            let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const tag = cipher.getAuthTag();
            
            return {
                encrypted: encrypted,
                iv: iv.toString('hex'),
                tag: tag.toString('hex'),
                algorithm: this.algorithm
            };
        } catch (error) {
            throw new Error(`Encryption failed: ${error.message}`);
        }
    }

    // Decrypt data
    decryptData(encryptedData, key = null) {
        try {
            const encryptionKey = key || this.dataKey;
            const decipher = crypto.createDecipher(this.algorithm, encryptionKey);
            
            decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
            
            let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return JSON.parse(decrypted);
        } catch (error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }

    // Encrypt sensor data
    encryptSensorData(sensorData) {
        const dataToEncrypt = {
            device_id: sensorData.device_id,
            timestamp: sensorData.timestamp,
            soil_moisture: sensorData.soil_moisture,
            temperature: sensorData.temperature,
            humidity: sensorData.humidity,
            light: sensorData.light,
            location: sensorData.location
        };

        return this.encryptData(dataToEncrypt);
    }

    // Decrypt sensor data
    decryptSensorData(encryptedSensorData) {
        return this.decryptData(encryptedSensorData);
    }

    // Encrypt database fields
    encryptDatabaseField(value, fieldName) {
        if (value === null || value === undefined) {
            return value;
        }

        const fieldData = {
            field: fieldName,
            value: value,
            timestamp: new Date().toISOString()
        };

        return this.encryptData(fieldData);
    }

    // Decrypt database field
    decryptDatabaseField(encryptedField) {
        if (!encryptedField || typeof encryptedField !== 'object') {
            return encryptedField;
        }

        return this.decryptData(encryptedField);
    }

    // Hash sensitive data (one-way)
    hashSensitiveData(data, salt = null) {
        const dataSalt = salt || crypto.randomBytes(this.saltLength);
        const hash = crypto.pbkdf2Sync(
            JSON.stringify(data), 
            dataSalt, 
            100000, 
            this.keyLength, 
            'sha512'
        );

        return {
            hash: hash.toString('hex'),
            salt: dataSalt.toString('hex')
        };
    }

    // Verify hashed data
    verifyHashedData(data, hash, salt) {
        const dataSalt = Buffer.from(salt, 'hex');
        const computedHash = crypto.pbkdf2Sync(
            JSON.stringify(data),
            dataSalt,
            100000,
            this.keyLength,
            'sha512'
        );

        return crypto.timingSafeEqual(computedHash, Buffer.from(hash, 'hex'));
    }

    // Encrypt file data
    encryptFile(fileBuffer, filename) {
        const fileData = {
            filename: filename,
            data: fileBuffer.toString('base64'),
            timestamp: new Date().toISOString(),
            size: fileBuffer.length
        };

        return this.encryptData(fileData);
    }

    // Decrypt file data
    decryptFile(encryptedFileData) {
        const decryptedData = this.decryptData(encryptedFileData);
        return {
            filename: decryptedData.filename,
            data: Buffer.from(decryptedData.data, 'base64'),
            timestamp: decryptedData.timestamp,
            size: decryptedData.size
        };
    }

    // Generate secure random token
    generateSecureToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    // Generate secure password
    generateSecurePassword(length = 16) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        
        return password;
    }

    // Encrypt API keys
    encryptApiKey(apiKey, deviceId) {
        const keyData = {
            apiKey: apiKey,
            deviceId: deviceId,
            createdAt: new Date().toISOString()
        };

        return this.encryptData(keyData, this.masterKey);
    }

    // Decrypt API key
    decryptApiKey(encryptedApiKey) {
        return this.decryptData(encryptedApiKey, this.masterKey);
    }

    // Encrypt configuration data
    encryptConfiguration(config) {
        const configData = {
            ...config,
            encryptedAt: new Date().toISOString(),
            version: '1.0'
        };

        return this.encryptData(configData);
    }

    // Decrypt configuration data
    decryptConfiguration(encryptedConfig) {
        return this.decryptData(encryptedConfig);
    }

    // Create encrypted backup
    createEncryptedBackup(data) {
        const backupData = {
            data: data,
            timestamp: new Date().toISOString(),
            version: '1.0',
            checksum: crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')
        };

        return this.encryptData(backupData);
    }

    // Restore from encrypted backup
    restoreFromEncryptedBackup(encryptedBackup) {
        const backupData = this.decryptData(encryptedBackup);
        
        // Verify checksum
        const computedChecksum = crypto.createHash('sha256')
            .update(JSON.stringify(backupData.data))
            .digest('hex');
        
        if (computedChecksum !== backupData.checksum) {
            throw new Error('Backup data integrity check failed');
        }

        return backupData.data;
    }

    // Get encryption status
    getEncryptionStatus() {
        return {
            algorithm: this.algorithm,
            keyLength: this.keyLength,
            ivLength: this.ivLength,
            tagLength: this.tagLength,
            masterKeyAvailable: !!this.masterKey,
            dataKeyAvailable: !!this.dataKey,
            status: 'operational'
        };
    }

    // Rotate encryption keys
    rotateKeys() {
        const oldDataKey = this.dataKey;
        this.dataKey = this.generateDataKey();
        
        return {
            oldKey: oldDataKey.toString('hex'),
            newKey: this.dataKey.toString('hex'),
            rotatedAt: new Date().toISOString()
        };
    }
}

module.exports = EncryptionService;
