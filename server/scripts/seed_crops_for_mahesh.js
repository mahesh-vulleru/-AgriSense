import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/User.js';
import Farm from '../src/models/Farm.js';
import Crop from '../src/models/Crop.js';
import { connectDB } from '../src/config/db.js';

async function seed() {
  await connectDB();
  const email = 'maheshvulleru@gmail.com';
  let user = await User.findOne({ email }).select('+passwordHash');

  if (!user) {
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
    console.log('User found:', user.email);
    // Ensure password matches Mahesh@123
    const isMatch = await bcrypt.compare('Mahesh@123', user.passwordHash);
    if (!isMatch) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash('Mahesh@123', salt);
      await user.save();
      console.log('Updated password to Mahesh@123');
    }
  }

  // Ensure farms exist
  let farm1 = await Farm.findOne({ owner: user._id, name: 'Krishna Delta Farm' });
  if (!farm1) {
    farm1 = await Farm.create({
      owner: user._id,
      name: 'Krishna Delta Farm',
      location: 'Vijayawada, Andhra Pradesh',
      state: 'Andhra Pradesh',
      district: 'Krishna',
      village: 'Gannavaram',
      acreage: 32.0,
      soilType: 'Alluvial',
      irrigationType: 'Flood',
      mainCrops: ['Rice (Paddy)', 'Sugarcane'],
      status: 'Active',
    });
  }

  let farm2 = await Farm.findOne({ owner: user._id, name: 'Telangana Black Soil Plot' });
  if (!farm2) {
    farm2 = await Farm.create({
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

  // Clear previous crops for clean seed
  await Crop.deleteMany({ owner: user._id });

  // 1. Basmati Rice: Active, Vegetative Growth (Step 5/9, 60%)
  await Crop.create({
    owner: user._id,
    farm: farm1._id,
    name: 'Basmati Rice',
    variety: 'Pusa Basmati 1121',
    cultivatedArea: 18.0,
    plantingDate: new Date('2026-09-20'),
    expectedHarvestDate: new Date('2027-01-15'),
    growthStage: 'Vegetative Growth',
    status: 'Active',
    notes: 'Premium fragrant grain under intermittent flood irrigation.',
  });

  // 2. Sugarcane: Active, Flowering (Step 6/9, 75%)
  await Crop.create({
    owner: user._id,
    farm: farm1._id,
    name: 'Sugarcane',
    variety: 'Co 0238',
    cultivatedArea: 14.0,
    plantingDate: new Date('2026-06-10'),
    expectedHarvestDate: new Date('2027-04-20'),
    growthStage: 'Flowering',
    status: 'Active',
    notes: 'High sucrose content ratoon crop.',
  });

  // 3. Bt Cotton: Active, Fruiting / Boll Formation (Step 7/9, 85%) - Due in ~20 days
  await Crop.create({
    owner: user._id,
    farm: farm2._id,
    name: 'Bt Cotton',
    variety: 'RCH-659',
    cultivatedArea: 12.0,
    plantingDate: new Date('2026-07-15'),
    expectedHarvestDate: new Date('2026-11-26'),
    growthStage: 'Fruiting',
    status: 'Active',
    notes: 'Precision drip-fertigated parcel; boll opening expected shortly.',
  });

  // 4. Guntur Red Chili: Harvested (Step 9/9, 100%)
  await Crop.create({
    owner: user._id,
    farm: farm2._id,
    name: 'Guntur Red Chili',
    variety: 'Teja S17',
    cultivatedArea: 8.0,
    plantingDate: new Date('2026-05-01'),
    expectedHarvestDate: new Date('2026-10-15'),
    growthStage: 'Harvested',
    status: 'Harvested',
    notes: 'Bumper yield sun-drying in progress.',
  });

  console.log('SUCCESSFULLY_SEEDED_CROPS_FOR_MAHESH');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
