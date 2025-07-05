const crypto = require('crypto');

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;

/**
 * Derives a key from password using PBKDF2
 * @param {string} password - The password to derive key from
 * @param {Buffer} salt - The salt for key derivation
 * @returns {Buffer} The derived key
 */
function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha512');
}

/**
 * Encrypts a private key using AES-256-GCM
 * @param {string} privateKey - The private key to encrypt
 * @param {string} password - The password for encryption
 * @returns {object} Object containing encrypted data and metadata
 */
function encryptPrivateKey(privateKey, password) {
  try {
    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive key from password
    const key = deriveKey(password, salt);
    
    // Create cipher
    const cipher = crypto.createCipher(ALGORITHM, key);
    cipher.setAAD(Buffer.from('private-key-encryption'));
    
    // Encrypt the private key
    let encrypted = cipher.update(privateKey, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // Get authentication tag
    const tag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted.toString('hex'),
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      algorithm: ALGORITHM
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypts a private key using AES-256-GCM
 * @param {object} encryptedData - The encrypted data object
 * @param {string} password - The password for decryption
 * @returns {string} The decrypted private key
 */
function decryptPrivateKey(encryptedData, password) {
  try {
    const { encrypted, salt, iv, tag, algorithm } = encryptedData;
    
    if (algorithm !== ALGORITHM) {
      throw new Error('Invalid encryption algorithm');
    }
    
    // Convert hex strings back to buffers
    const encryptedBuffer = Buffer.from(encrypted, 'hex');
    const saltBuffer = Buffer.from(salt, 'hex');
    const ivBuffer = Buffer.from(iv, 'hex');
    const tagBuffer = Buffer.from(tag, 'hex');
    
    // Derive key from password
    const key = deriveKey(password, saltBuffer);
    
    // Create decipher
    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAAD(Buffer.from('private-key-encryption'));
    decipher.setAuthTag(tagBuffer);
    
    // Decrypt the private key
    let decrypted = decipher.update(encryptedBuffer);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Generates a secure random password for encryption
 * @returns {string} A secure random password
 */
function generateSecurePassword() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validates if a string is a valid Ethereum private key
 * @param {string} privateKey - The private key to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidEthereumPrivateKey(privateKey) {
  try {
    // Remove 0x prefix if present
    const cleanKey = privateKey.replace(/^0x/, '');
    
    // Check if it's 64 hex characters
    if (cleanKey.length !== 64) return false;
    
    // Check if it's valid hex
    if (!/^[0-9a-fA-F]+$/.test(cleanKey)) return false;
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validates if a string is a valid Aptos private key
 * @param {string} privateKey - The private key to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidAptosPrivateKey(privateKey) {
  try {
    // Remove 0x prefix if present
    const cleanKey = privateKey.replace(/^0x/, '');
    
    // Check if it's 64 hex characters
    if (cleanKey.length !== 64) return false;
    
    // Check if it's valid hex
    if (!/^[0-9a-fA-F]+$/.test(cleanKey)) return false;
    
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  encryptPrivateKey,
  decryptPrivateKey,
  generateSecurePassword,
  isValidEthereumPrivateKey,
  isValidAptosPrivateKey
};