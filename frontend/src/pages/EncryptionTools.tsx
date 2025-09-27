import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Tabs,
  Tab,
  Paper,
  Chip,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  Lock as LockIcon,
  LockOpen as UnlockIcon,
  Security as SecurityIcon,
  VpnKey as KeyIcon,
  Backup as BackupIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`encryption-tabpanel-${index}`}
      aria-labelledby={`encryption-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const EncryptionTools: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data encryption states
  const [sensorData, setSensorData] = useState('');
  const [encryptedData, setEncryptedData] = useState('');
  const [decryptedData, setDecryptedData] = useState('');

  // Field encryption states
  const [fieldData, setFieldData] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [fieldEncrypted, setFieldEncrypted] = useState('');
  const [fieldDecrypted, setFieldDecrypted] = useState('');

  // Hash states
  const [hashData, setHashData] = useState('');
  const [hashResult, setHashResult] = useState('');
  const [verifyHashValue, setVerifyHashValue] = useState('');
  const [verifyData, setVerifyData] = useState('');

  // Token generation states
  const [tokenLength, setTokenLength] = useState(32);
  const [generatedToken, setGeneratedToken] = useState('');

  // Password generation states
  const [passwordLength, setPasswordLength] = useState(12);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState('');

  const API_BASE = 'http://localhost:3002';

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError('');
    setSuccess('');
    setResult('');
  };

  const encryptSensorData = async () => {
    if (!sensorData) {
      setError('Please enter sensor data to encrypt');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/api/encrypt/sensor-data`, {
        sensorData: JSON.parse(sensorData)
      });
      setEncryptedData(JSON.stringify(response.data.encryptedData, null, 2));
      setSuccess('Sensor data encrypted successfully');
    } catch (error) {
      setError('Failed to encrypt sensor data');
    } finally {
      setLoading(false);
    }
  };

  const decryptSensorData = async () => {
    if (!encryptedData) {
      setError('Please enter encrypted data to decrypt');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/api/decrypt/sensor-data`, {
        encryptedData: JSON.parse(encryptedData)
      });
      setDecryptedData(JSON.stringify(response.data.decryptedData, null, 2));
      setSuccess('Sensor data decrypted successfully');
    } catch (error) {
      setError('Failed to decrypt sensor data');
    } finally {
      setLoading(false);
    }
  };

  const encryptField = async () => {
    if (!fieldData || !fieldKey) {
      setError('Please enter both field data and key');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/api/encrypt/field`, {
        data: fieldData,
        key: fieldKey
      });
      setFieldEncrypted(response.data.encryptedData);
      setSuccess('Field encrypted successfully');
    } catch (error) {
      setError('Failed to encrypt field');
    } finally {
      setLoading(false);
    }
  };

  const decryptField = async () => {
    if (!fieldEncrypted || !fieldKey) {
      setError('Please enter both encrypted data and key');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/api/decrypt/field`, {
        encryptedData: fieldEncrypted,
        key: fieldKey
      });
      setFieldDecrypted(response.data.decryptedData);
      setSuccess('Field decrypted successfully');
    } catch (error) {
      setError('Failed to decrypt field');
    } finally {
      setLoading(false);
    }
  };

  const generateHash = async () => {
    if (!hashData) {
      setError('Please enter data to hash');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/api/hash/data`, {
        data: hashData
      });
      setHashResult(response.data.hash);
      setSuccess('Hash generated successfully');
    } catch (error) {
      setError('Failed to generate hash');
    } finally {
      setLoading(false);
    }
  };

  const verifyHash = async () => {
    if (!verifyData || !verifyHashValue) {
      setError('Please enter both data and hash to verify');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/api/verify/hash`, {
        data: verifyData,
        hash: verifyHashValue
      });
      setResult(response.data.valid ? 'Hash is valid' : 'Hash is invalid');
      setSuccess('Hash verification completed');
    } catch (error) {
      setError('Failed to verify hash');
    } finally {
      setLoading(false);
    }
  };

  const generateToken = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/api/generate/token`, {
        length: tokenLength
      });
      setGeneratedToken(response.data.token);
      setSuccess('Token generated successfully');
    } catch (error) {
      setError('Failed to generate token');
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/api/generate/password`, {
        length: passwordLength,
        includeSymbols: includeSymbols
      });
      setGeneratedPassword(response.data.password);
      setSuccess('Password generated successfully');
    } catch (error) {
      setError('Failed to generate password');
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/api/backup/create`);
      setResult(`Backup created: ${response.data.backupId}`);
      setSuccess('Backup created successfully');
    } catch (error) {
      setError('Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Encryption Tools
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Advanced encryption and security tools for data protection
      </Typography>

      <Paper sx={{ mt: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="encryption tools">
          <Tab label="Data Encryption" icon={<LockIcon />} />
          <Tab label="Field Encryption" icon={<SecurityIcon />} />
          <Tab label="Hash & Verify" icon={<KeyIcon />} />
          <Tab label="Token Generator" icon={<KeyIcon />} />
          <Tab label="Password Generator" icon={<UnlockIcon />} />
          <Tab label="Backup Tools" icon={<BackupIcon />} />
        </Tabs>

        {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ m: 2 }}>{success}</Alert>}

        {/* Data Encryption Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 1' } }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Encrypt Sensor Data
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    label="Sensor Data (JSON)"
                    value={sensorData}
                    onChange={(e) => setSensorData(e.target.value)}
                    placeholder='{"soil_moisture": 45, "temperature": 25, "humidity": 65}'
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="contained"
                    onClick={encryptSensorData}
                    disabled={loading}
                    startIcon={<LockIcon />}
                  >
                    Encrypt
                  </Button>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 1' } }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Encrypted Result
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    value={encryptedData}
                    InputProps={{ readOnly: true }}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="outlined"
                    onClick={decryptSensorData}
                    disabled={loading || !encryptedData}
                    startIcon={<UnlockIcon />}
                  >
                    Decrypt
                  </Button>
                </CardContent>
              </Card>
            </Box>
            {decryptedData && (
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Decrypted Result
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      value={decryptedData}
                      InputProps={{ readOnly: true }}
                    />
                  </CardContent>
                </Card>
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* Field Encryption Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 1' } }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Field Encryption
                  </Typography>
                  <TextField
                    fullWidth
                    label="Data to Encrypt"
                    value={fieldData}
                    onChange={(e) => setFieldData(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Encryption Key"
                    value={fieldKey}
                    onChange={(e) => setFieldKey(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="contained"
                    onClick={encryptField}
                    disabled={loading}
                    startIcon={<LockIcon />}
                  >
                    Encrypt Field
                  </Button>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 1' } }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Encrypted Field
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={fieldEncrypted}
                    InputProps={{ readOnly: true }}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="outlined"
                    onClick={decryptField}
                    disabled={loading || !fieldEncrypted}
                    startIcon={<UnlockIcon />}
                  >
                    Decrypt Field
                  </Button>
                </CardContent>
              </Card>
            </Box>
            {fieldDecrypted && (
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Decrypted Field
                    </Typography>
                    <TextField
                      fullWidth
                      value={fieldDecrypted}
                      InputProps={{ readOnly: true }}
                    />
                  </CardContent>
                </Card>
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* Hash & Verify Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 1' } }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Generate Hash
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Data to Hash"
                    value={hashData}
                    onChange={(e) => setHashData(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="contained"
                    onClick={generateHash}
                    disabled={loading}
                    startIcon={<KeyIcon />}
                  >
                    Generate Hash
                  </Button>
                  {hashResult && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Hash Result:
                      </Typography>
                      <TextField
                        fullWidth
                        value={hashResult}
                        InputProps={{ readOnly: true }}
                        size="small"
                      />
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 1' } }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Verify Hash
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Data to Verify"
                    value={verifyData}
                    onChange={(e) => setVerifyData(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Hash to Verify"
                    value={verifyHashValue}
                    onChange={(e) => setVerifyHashValue(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="outlined"
                    onClick={verifyHash}
                    disabled={loading}
                    startIcon={<SecurityIcon />}
                  >
                    Verify Hash
                  </Button>
                  {result && (
                    <Box sx={{ mt: 2 }}>
                      <Chip
                        label={result}
                        color={result.includes('valid') ? 'success' : 'error'}
                      />
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Box>
        </TabPanel>

        {/* Token Generator Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 1' } }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Generate Token
                  </Typography>
                  <TextField
                    fullWidth
                    type="number"
                    label="Token Length"
                    value={tokenLength}
                    onChange={(e) => setTokenLength(parseInt(e.target.value))}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="contained"
                    onClick={generateToken}
                    disabled={loading}
                    startIcon={<KeyIcon />}
                  >
                    Generate Token
                  </Button>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 1' } }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Generated Token
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={generatedToken}
                    InputProps={{ readOnly: true }}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="outlined"
                    onClick={() => navigator.clipboard.writeText(generatedToken)}
                    disabled={!generatedToken}
                  >
                    Copy to Clipboard
                  </Button>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </TabPanel>

        {/* Password Generator Tab */}
        <TabPanel value={tabValue} index={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 1' } }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Generate Password
                  </Typography>
                  <TextField
                    fullWidth
                    type="number"
                    label="Password Length"
                    value={passwordLength}
                    onChange={(e) => setPasswordLength(parseInt(e.target.value))}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="contained"
                    onClick={generatePassword}
                    disabled={loading}
                    startIcon={<UnlockIcon />}
                  >
                    Generate Password
                  </Button>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 1' } }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Generated Password
                  </Typography>
                  <TextField
                    fullWidth
                    value={generatedPassword}
                    InputProps={{ readOnly: true }}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="outlined"
                    onClick={() => navigator.clipboard.writeText(generatedPassword)}
                    disabled={!generatedPassword}
                  >
                    Copy to Clipboard
                  </Button>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </TabPanel>

        {/* Backup Tools Tab */}
        <TabPanel value={tabValue} index={5}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Backup & Restore
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Create encrypted backups of your data and restore them when needed.
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={createBackup}
                      disabled={loading}
                      startIcon={<BackupIcon />}
                      sx={{ mr: 2 }}
                    >
                      Create Backup
                    </Button>
                  </Box>
                  {result && (
                    <Box sx={{ mt: 2 }}>
                      <Alert severity="info">
                        {result}
                      </Alert>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Box>
        </TabPanel>
      </Paper>

      {loading && <LinearProgress sx={{ mt: 2 }} />}
    </Box>
  );
};

export default EncryptionTools;
