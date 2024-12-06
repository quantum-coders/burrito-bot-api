// utils/crypto.js

import crypto from 'crypto';

/**
 * Desencripta una private key usando AES-256-CBC.
 * @param {string} encryptedKey - Clave privada encriptada en formato hex.
 * @param {string} secret - Clave secreta para la encriptación.
 * @returns {string} - Clave privada desencriptada.
 */
export const decryptPrivateKey = (encryptedKey, secret) => {
    try {
        const iv = Buffer.from(encryptedKey.slice(0, 32), 'hex'); // Asumiendo que los primeros 16 bytes son el IV
        const encryptedText = Buffer.from(encryptedKey.slice(32), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secret, 'hex'), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        console.error('❌ Error en decryptPrivateKey:', error);
        throw new Error('Desencriptación fallida.');
    }
};
