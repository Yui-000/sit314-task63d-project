class DataValidator {
  constructor() {
    this.validationRules = {
      temperature: { min: -50, max: 100, required: true },
      humidity: { min: 0, max: 100, required: true },
      soil_moisture: { min: 0, max: 100, required: true },
      light_intensity: { min: 0, max: 100000, required: true },
      ph_level: { min: 0, max: 14, required: true },
      device_id: { required: true, type: 'string' },
      timestamp: { required: true, type: 'number' }
    };
  }

  validate(data) {
    const errors = [];
    const warnings = [];

    // Check required fields
    for (const [field, rules] of Object.entries(this.validationRules)) {
      if (rules.required && (data[field] === undefined || data[field] === null)) {
        errors.push(`Missing required field: ${field}`);
        continue;
      }

      if (data[field] !== undefined && data[field] !== null) {
        // Type validation
        if (rules.type === 'string' && typeof data[field] !== 'string') {
          errors.push(`Field ${field} must be a string`);
        } else if (rules.type === 'number' && typeof data[field] !== 'number') {
          errors.push(`Field ${field} must be a number`);
        }

        // Range validation for numeric fields
        if (rules.min !== undefined && data[field] < rules.min) {
          errors.push(`Field ${field} value ${data[field]} is below minimum ${rules.min}`);
        }
        if (rules.max !== undefined && data[field] > rules.max) {
          errors.push(`Field ${field} value ${data[field]} is above maximum ${rules.max}`);
        }
      }
    }

    // Check timestamp validity
    if (data.timestamp) {
      const now = Date.now();
      const dataTime = new Date(data.timestamp).getTime();
      const timeDiff = Math.abs(now - dataTime);
      
      // Warn if data is more than 1 hour old
      if (timeDiff > 3600000) {
        warnings.push('Data timestamp is more than 1 hour old');
      }
      
      // Error if data is more than 24 hours old
      if (timeDiff > 86400000) {
        errors.push('Data timestamp is more than 24 hours old');
      }
    }

    // Check for reasonable sensor value combinations
    if (data.temperature && data.humidity) {
      if (data.temperature > 40 && data.humidity > 80) {
        warnings.push('High temperature and humidity combination may indicate sensor malfunction');
      }
    }

    if (data.soil_moisture && data.humidity) {
      if (data.soil_moisture > 90 && data.humidity < 20) {
        warnings.push('High soil moisture with low humidity may indicate sensor inconsistency');
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      validatedAt: new Date().toISOString()
    };
  }

  validateBatch(dataArray) {
    const results = dataArray.map(data => ({
      data: data,
      validation: this.validate(data)
    }));

    const validData = results.filter(result => result.validation.isValid);
    const invalidData = results.filter(result => !result.validation.isValid);

    return {
      total: dataArray.length,
      valid: validData.length,
      invalid: invalidData.length,
      validData: validData.map(result => result.data),
      invalidData: invalidData,
      validationSummary: {
        totalErrors: invalidData.reduce((sum, result) => sum + result.validation.errors.length, 0),
        totalWarnings: results.reduce((sum, result) => sum + result.validation.warnings.length, 0)
      }
    };
  }

  updateValidationRules(field, rules) {
    this.validationRules[field] = { ...this.validationRules[field], ...rules };
  }

  getValidationRules() {
    return { ...this.validationRules };
  }
}

module.exports = DataValidator;
