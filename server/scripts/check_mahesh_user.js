import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/User.js';
import Farm from '../src/models/Farm.js';
import { connectDB } from '../src/config/db.js';

async function check() {
  await connectDB();
  const email = 'maheshvulleru@gmail.com';
  let user = await User.findOne({ email }).select('+passwordHash');

  if (!user) {
    console.log('User not found. Creating user with Mahesh@123...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Mahesh@123', salt);
    user = await User.create({
      fullName: 'Mahesh Vulleru',
      email,
      phone: '+919988776655',
      passwordHash,
      role: 'farmer',
      location: 'Hyderabad, Telangana',
      isActive: true,
    });
    console.log('Created user:', user.email);
  } else {
    console.log('User found:', user.email, 'Role:', user.role);
    // Ensure password matches Mahesh@123
    const isMatch = await bcrypt.compare('Mahesh@123', user.passwordHash);
    if (!isMatch) {
      console.log('Updating password to Mahesh@123...');
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash('Mahesh@123', salt);
      await user.save();
    }
  }

  // Check farms
  const farms = await Farm.find({ owner: user._id });
  console.log('Farms count for Mahesh:', farms.length);
  if (farms.length === 0) {
    console.log('Creating sample farms for Mahesh...');
    await Farm.create({
      owner: user._id,
      name: 'Krishna Delta Farm',
      location: 'Vijayawada, Andhra Pradesh',
      state: 'Andhra Pradesh',
      district: 'Krishna',
      village: 'Gannavaram',
      acreage: 32.0,
      soilType: 'Alluvial',
      irrigationType: 'Canal',
      mainCrops: ['Rice (Paddy)', 'Sugarcane'],
      status: 'Active',
    });

    await Farm.create({
      owner: user._id,
      name: 'Telangana Black Soil Plot',
      location: 'Warangal, Telangana',
      state: 'Telangana',
      district: 'Warangal',
      village: 'Hanamkonda',
      acreage: 20.0,
      soilType: 'Black',
      irrigationType: 'Drip',
      mainCrops: ['Cotton', 'Chili'],
      status: 'Active',
    });
  }

  await mongoose.disconnect();
}

check().catch(console.error);
