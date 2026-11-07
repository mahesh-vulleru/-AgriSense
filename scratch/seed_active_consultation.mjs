import mongoose from '../server/node_modules/mongoose/index.js';

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/agrisense');

  const farmer = await mongoose.connection.db.collection('users').findOne({ email: 'maheshvulleru@gmail.com' });
  const expert = await mongoose.connection.db.collection('users').findOne({ email: 'vullerumahesh14@gmail.com' });
  const farm = await mongoose.connection.db.collection('farms').findOne({ _id: new mongoose.Types.ObjectId('6aedacbfe29d4e9e5fd9bc7b') });
  const crop = await mongoose.connection.db.collection('crops').findOne({ _id: new mongoose.Types.ObjectId('6aedacbfe29d4e9e5fd9bc84') });
  const scan = await mongoose.connection.db.collection('diseasedetections').findOne({ farmer: farmer._id });

  // Generate Reference ID
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const refId = `CONS-${yyyy}${mm}${dd}-1088`;

  // Upsert Consultation
  const existing = await mongoose.connection.db.collection('consultations').findOne({ referenceId: refId });
  let consId;

  const consultationDoc = {
    referenceId: refId,
    farmer: farmer._id,
    expert: expert._id,
    farm: farm._id,
    crop: crop._id,
    diseaseScan: scan?._id || null,
    subject: 'Severe Bacterial Leaf Spot on Teja S17 Guntur Chili',
    description:
      'Noticed water-soaked circular lesions with chlorotic halos spreading rapidly across bottom leaves following heavy rainfall. Need immediate guidance on bactericide dosage, spray intervals, and canopy management before infection reaches flowering nodes.',
    category: 'Crop Protection',
    priority: 'High',
    preferredMethod: 'In-App Message',
    status: 'Response Provided',
    attachments: [
      {
        url: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=800&q=80',
        filename: 'chili_leaf_spot_lesions.jpg',
        uploadedAt: new Date(Date.now() - 3600000 * 4),
      },
    ],
    statusHistory: [
      {
        status: 'Submitted',
        changedBy: farmer._id,
        changedAt: new Date(Date.now() - 3600000 * 4),
        notes: 'Inquiry submitted by farmer with foliage photograph',
      },
      {
        status: 'Assigned',
        changedBy: farmer._id,
        changedAt: new Date(Date.now() - 3600000 * 3.5),
        notes: 'Matched with Dr. Ganesh Vulleru (Crop Protection Specialist)',
      },
      {
        status: 'Accepted',
        changedBy: expert._id,
        changedAt: new Date(Date.now() - 3600000 * 3),
        notes: 'Consultation accepted by specialist',
      },
      {
        status: 'In Progress',
        changedBy: expert._id,
        changedAt: new Date(Date.now() - 3600000 * 2),
        notes: 'Specialist commenced diagnostic evaluation',
      },
      {
        status: 'Response Provided',
        changedBy: expert._id,
        changedAt: new Date(Date.now() - 3600000 * 1),
        notes: 'Comprehensive agronomic advisory protocol published to farmer',
      },
    ],
    recommendation: {
      problemAssessment:
        'Foliar necrosis and circular water-soaked leaf lesions consistent with Xanthomonas campestris pv. vesicatoria (Bacterial Leaf Spot) exacerbated by elevated relative humidity (88%) and micro-sprinkler splashing in the lower canopy.',
      possibleCauses: [
        'Xanthomonas campestris pv. vesicatoria pathogen infection',
        'Micro-sprinkler water splashing spreading bacterial exudate',
        'Dense lower foliage restricting natural airflow',
      ],
      recommendedPractices:
        '1. Apply Copper Oxychloride 50% WP @ 3.0g/L + Streptocycline (Streptomycin sulphate + Tetracycline hydrochloride) @ 0.1g/L as a thorough foliar spray targeting both adaxial and abaxial leaf surfaces.\n2. Repeat spray after 7-10 days if humid weather persists.\n3. Adjust irrigation to avoid overhead wetting of chili foliage.',
      preventiveMeasures:
        'Sterilize pruning shears between rows with 5% sodium hypochlorite solution, rogue out severely blighted lower leaves, and incorporate Trichoderma viride enriched farmyard manure around the root zones to enhance systemic resistance.',
      followUpTimeline: 'Inspect lower leaf nodes 5 days post-spray; submit updated leaf picture in this workspace.',
      expertNotes:
        'Maintain spray pressure at 35-40 PSI with hollow cone nozzles for uniform canopy penetration. Do not mix copper fungicides with organophosphates.',
      providedAt: new Date(Date.now() - 3600000 * 1),
    },
    createdAt: new Date(Date.now() - 3600000 * 4),
    updatedAt: new Date(Date.now() - 3600000 * 1),
  };

  if (existing) {
    consId = existing._id;
    await mongoose.connection.db.collection('consultations').updateOne({ _id: consId }, { $set: consultationDoc });
    console.log('Updated existing consultation:', refId);
  } else {
    const res = await mongoose.connection.db.collection('consultations').insertOne(consultationDoc);
    consId = res.insertedId;
    console.log('Created new consultation:', refId, consId);
  }

  // Clear and seed messages for this consultation
  await mongoose.connection.db.collection('consultationmessages').deleteMany({ consultation: consId });

  const messages = [
    {
      consultation: consId,
      sender: farmer._id,
      senderRole: 'farmer',
      message:
        'Hello Dr. Ganesh, I noticed these circular brown lesions spreading rapidly on my Guntur Teja chili crop since yesterday morning. Will this affect my flowering stage?',
      attachments: [
        {
          url: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=800&q=80',
          filename: 'chili_leaf_spot_lesions.jpg',
        },
      ],
      isReadByFarmer: true,
      isReadByExpert: true,
      createdAt: new Date(Date.now() - 3600000 * 3.5),
    },
    {
      consultation: consId,
      sender: expert._id,
      senderRole: 'expert',
      message:
        'Namaste Mahesh garu. I have reviewed your field photos and AI scan. The symptoms point clearly to Bacterial Leaf Spot (Xanthomonas). Do not panic—it is in early vegetative/flowering transition, so prompt bactericidal spray will arrest it effectively.',
      attachments: [],
      isReadByFarmer: true,
      isReadByExpert: true,
      createdAt: new Date(Date.now() - 3600000 * 2.5),
    },
    {
      consultation: consId,
      sender: null,
      senderRole: 'system',
      message: 'Dr. Ganesh Vulleru published official agronomic recommendations for case #' + refId,
      attachments: [],
      isReadByFarmer: true,
      isReadByExpert: true,
      createdAt: new Date(Date.now() - 3600000 * 1),
    },
    {
      consultation: consId,
      sender: expert._id,
      senderRole: 'expert',
      message:
        'I have published the detailed spray protocol above. Please source fresh Copper Oxychloride 50% WP and Streptocycline. Spray in the cool evening hours when wind is minimal.',
      attachments: [],
      isReadByFarmer: false,
      isReadByExpert: true,
      createdAt: new Date(Date.now() - 3600000 * 0.8),
    },
  ];

  await mongoose.connection.db.collection('consultationmessages').insertMany(messages);
  console.log(`Seeded ${messages.length} messages for consultation ${refId}`);

  await mongoose.disconnect();
}

main().catch(console.error);
