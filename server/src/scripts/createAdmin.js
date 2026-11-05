import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables from server root .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env') });

import dns from 'dns';
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/agrisense';

if (mongoUri.startsWith('mongodb+srv://')) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  } catch (err) {
    console.warn('DNS override error:', err.message);
  }
}

import User from '../models/User.js';

async function createAdmin() {
  const args = process.argv.slice(2);
  const parsedArgs = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].replace(/^--/, '');
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      parsedArgs[key] = val;
    }
  }

  const name = parsedArgs.name || process.env.ADMIN_NAME || 'AgriSense Admin';
  const email = (parsedArgs.email || process.env.ADMIN_EMAIL || 'admin@agrisense.com').toLowerCase().trim();
  const password = parsedArgs.password || process.env.ADMIN_PASSWORD || 'AgriSenseAdmin2026!';
  const phone = parsedArgs.phone || '+1-800-555-0199';
  const location = parsedArgs.location || 'Headquarters';

  if (!email || !password) {
    console.error('Error: Admin email and password are required.');
    console.error('Usage: node src/scripts/createAdmin.js --name "Admin Name" --email "admin@agrisense.com" --password "StrongPass123!"');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Error: Admin password must be at least 8 characters long.');
    process.exit(1);
  }

  try {
    console.log('Connecting to database...');
    await mongoose.connect(mongoUri, { dbName: 'agrisense' });
    console.log('Connected to MongoDB.');

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      if (existing.role === 'admin') {
        console.log(`Notice: Admin account '${email}' already exists. Updating credentials...`);
        existing.passwordHash = await bcrypt.hash(password, 12);
        existing.name = name;
        existing.phone = phone;
        existing.location = location;
        existing.isActive = true;
        await existing.save();
        console.log(`[SUCCESS] Admin '${email}' credentials updated successfully.`);
      } else {
        console.log(`Notice: User '${email}' exists with role '${existing.role}'. Promoting to 'admin'...`);
        existing.role = 'admin';
        existing.passwordHash = await bcrypt.hash(password, 12);
        await existing.save();
        console.log(`[SUCCESS] User '${email}' promoted to Admin role successfully.`);
      }
    } else {
      const passwordHash = await bcrypt.hash(password, 12);
      const adminUser = await User.create({
        name,
        email,
        passwordHash,
        phone,
        location,
        role: 'admin',
        isActive: true,
      });

      console.log('----------------------------------------------------');
      console.log(' [SUCCESS] First Administrator Created Successfully:');
      console.log(` ID:       ${adminUser._id}`);
      console.log(` Name:     ${adminUser.name}`);
      console.log(` Email:    ${adminUser.email}`);
      console.log(` Role:     ${adminUser.role}`);
      console.log(` Location: ${adminUser.location}`);
      console.log('----------------------------------------------------');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Failed to create admin user:', err);
    process.exit(1);
  }
}

createAdmin();

