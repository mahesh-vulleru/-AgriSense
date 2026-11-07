import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import models
import User from '../src/models/User.js';
import Farm from '../src/models/Farm.js';
import Crop from '../src/models/Crop.js';
import DiseaseScan from '../src/models/DiseaseScan.js';

async function seed() {
  await mongoose.connect('mongodb://127.0.0.1:27017/agrisense');
  console.log('Connected to MongoDB');

  const farmer = await User.findOne({ email: 'maheshvulleru@gmail.com' });
  if (!farmer) {
    console.error('Farmer maheshvulleru@gmail.com not found');
    process.exit(1);
  }

  // Find chili crop or any crop owned by farmer
  let crop = await Crop.findOne({ owner: farmer._id, name: /Chili/i });
  if (!crop) {
    crop = await Crop.findOne({ owner: farmer._id });
  }

  if (!crop) {
    console.error('No crops found for farmer');
    process.exit(1);
  }

  const farm = await Farm.findById(crop.farm);
  console.log(`Using Farmer: ${farmer.name}, Farm: ${farm?.name}, Crop: ${crop.name}`);

  // Create a sample image file in uploads/disease_scans
  const uploadDir = path.resolve(__dirname, '../uploads/disease_scans');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const sampleImagePath = path.join(uploadDir, 'chili_anthracnose_sample.jpg');
  const sampleJpegBase64 =
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  fs.writeFileSync(sampleImagePath, Buffer.from(sampleJpegBase64, 'base64'));

  // Clear existing seeded scans or check if any exist
  const existingCount = await DiseaseScan.countDocuments({ farmer: farmer._id });
  if (existingCount === 0) {
    const scan = await DiseaseScan.create({
      farmer: farmer._id,
      farm: farm._id,
      crop: crop._id,
      image: {
        url: 'http://localhost:5000/uploads/disease_scans/chili_anthracnose_sample.jpg',
        filename: 'chili_anthracnose_sample.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 15420,
        captureMethod: 'upload',
      },
      scanTimestamp: new Date(Date.now() - 3600000 * 2), // 2 hours ago
      aiProvider: 'gemini',
      aiModel: 'gemini-2.5-flash',
      status: 'Diseased',
      identifiedCrop: 'Chili (Capsicum annuum)',
      suitableForAnalysis: true,
      possibleDisease: 'Anthracnose / Fruit Rot (Colletotrichum capsici)',
      visibleSymptoms: [
        'Sunken circular necrotic lesions with concentric dark acervuli rings',
        'Water-soaked brown margins on lower leaf surfaces',
        'Chlorotic yellow halo surrounding lesions and early premature defoliation',
      ],
      alternativeCauses: [
        'Bacterial Leaf Spot (Xanthomonas campestris pv. vesicatoria)',
        'Cercospora Leaf Spot (Frogeye leaf spot)',
      ],
      explanation:
        'The photograph exhibits classic symptomology consistent with Anthracnose foliar infection. High relative humidity (78%) and warm temperatures (29°C) recorded on the farm parcel create optimal conditions for fungal sporulation and secondary splash dispersal across the chili canopy.',
      suggestedActions: [
        'Immediately prune and incinerate heavily infected lower foliage to reduce inoculum pressure.',
        'Apply protective copper oxychloride (3g/L) or systemic azoxystrobin 23% SC (1ml/L) targeting both upper and lower leaf surfaces.',
        'Suspend overhead sprinkler irrigation and switch to root-zone drip to prevent water splashing spores onto upper foliage.',
        'Maintain row spacing aeration and avoid excess nitrogen fertilization which promotes soft succulent tissue.',
      ],
      expertVerificationNeeded: true,
      confidenceNote: 'Confidence not calibrated',
      environmentalContext: {
        temperature: 28.5,
        humidity: 78,
        recentRainfallMm: 12.4,
        growthStage: crop.growthStage || 'Vegetative',
        soilMoisture: 'Optimal (64%)',
      },
      notes: 'Noticed dark spotting on lower leaves following monsoon rainfall shower.',
    });

    console.log('Seeded sample DiseaseScan:', scan._id);
  } else {
    console.log(`Found ${existingCount} existing disease scans for farmer.`);
  }

  await mongoose.disconnect();
}

seed().catch(console.error);
