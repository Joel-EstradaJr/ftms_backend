/**
 * JWT Token Generator Utility
 * Use this to generate valid JWT tokens for testing in Swagger UI
 * 
 * Usage:
 * 1. Run: npx tsx src/utils/generateToken.ts
 * 2. Copy the generated token
 * 3. In Swagger UI, paste it in the Authorize dialog
 */

import jwt from 'jsonwebtoken';
import { config } from '../config/env';

interface TokenPayload {
  userId: string;
  role: 'admin' | 'staff';
  email?: string;
  name?: string;
}

/**
 * Generate a JWT token for testing
 */
function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as string,
  } as jwt.SignOptions);
}

// Example tokens for testing
console.log('\n🔐 JWT Token Generator for FTMS Backend\n');
console.log('=' .repeat(80));
console.log('\n📋 Copy and paste these tokens in Swagger UI Authorize dialog:\n');

// Admin token
const adminToken = generateToken({
  userId: 'admin-001',
  role: 'admin',
  email: 'admin@ftms.com',
  name: 'Admin User',
});

console.log('🔑 ADMIN TOKEN (Full Access):');
console.log('-'.repeat(80));
console.log(adminToken);
console.log('\n');

// Staff token
const staffToken = generateToken({
  userId: 'staff-001',
  role: 'staff',
  email: 'staff@ftms.com',
  name: 'Staff User',
});

console.log('🔑 STAFF TOKEN (Limited Access):');
console.log('-'.repeat(80));
console.log(staffToken);
console.log('\n');

console.log('=' .repeat(80));
console.log('\n📝 How to use in Swagger UI:');
console.log('   1. Click the "Authorize" button (🔓 icon)');
console.log('   2. Paste ONE of the tokens above');
console.log('   3. Click "Authorize"');
console.log('   4. Test your endpoints!\n');
console.log('⏰ Token expires in:', config.jwtExpiresIn);
console.log('🔐 JWT Secret:', config.jwtSecret.substring(0, 10) + '...');
console.log('\n');
