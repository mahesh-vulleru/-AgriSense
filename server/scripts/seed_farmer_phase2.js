import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../src/models/User.js';
import Farm from '../src/models/Farm.js';
import { connectDB } from '../src/config/db.js';
import { env } from '../src/config/env.js';

async function seed() {
  await connectDB();

  const email = 'farmer.phase2@agrisense.test';
  let user = await User.findOne({ email });

  if (!user) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password123!', salt);
    user = await User.create({
      fullName: 'Ramesh Patel',
      email,
      phone: '+919876543210',
      passwordHash,
      role: 'farmer',
      location: 'Pune, Maharashtra',
      isActive: true,
    });
    console.log('Created user:', user.email);
  } else {
    console.log('Found existing user:', user.email);
  }

  // Remove previous farms for clean deterministic state
  await Farm.deleteMany({ owner: user._id });

  // 1. Farm Alpha: Active, 25.5 Acres
  await Farm.create({
    owner: user._id,
    name: 'Green Valley Farm Alpha',
    location: 'Taluka Haveli, Pune, Maharashtra',
    state: 'Maharashtra',
    district: 'Pune',
    village: 'Haveli',
    acreage: 25.5,
    soilType: 'Black',
    irrigationType: 'Drip',
    mainCrops: ['Wheat', 'Corn', 'Soybean'],
    status: 'Active',
    description: 'Primary precision crop cultivation parcel with automated drip lines.',
  });

  // 2. Farm Beta: Active, 18.0 Acres
  await Farm.create({
    owner: user._id,
    name: 'Sunrise Organic Orchard',
    location: 'Taluka Shirur, Pune, Maharashtra',
    state: 'Maharashtra',
    district: 'Pune',
    village: 'Shirur',
    acreage: 18.0,
    soilType: 'Loamy',
    irrigationType: 'Sprinkler',
    mainCrops: ['Tomato', 'Potato', 'Onion'],
    status: 'Active',
    description: 'High-density vegetable cultivation zone with overhead sprinkler layout.',
  });

  // 3. Farm Gamma: Archived, 10.5 Acres
  await Farm.create({
    owner: user._id,
    name: 'Highland Dry Parcel',
    location: 'Taluka Baramati, Pune, Maharashtra',
    state: 'Maharashtra',
    district: 'Pune',
    village: 'Baramati',
    acreage: 10.5,
    soilType: 'Sandy',
    irrigationType: 'Rain-fed',
    mainCrops: ['Barley'],
    status: 'Archived',
    description: 'Fallow plot currently under seasonal regeneration cycle.',
  });

  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.fullName || user.name,
    },
    env.JWT_SECRET || 'agrisense_super_secret_jwt_key_2026',
    { expiresIn: '7d' }
  );

  console.log('SEED_SUCCESS');
  console.log('JWT_TOKEN:', token);
  console.log('USER_ID:', user._id.toString());
  console.log('USER_EMAIL:', user.email);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
