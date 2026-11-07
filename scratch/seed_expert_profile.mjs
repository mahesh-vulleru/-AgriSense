import mongoose from '../server/node_modules/mongoose/index.js';

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/agrisense');
  await mongoose.connection.db.collection('users').updateOne(
    { email: 'vullerumahesh14@gmail.com' },
    {
      $set: {
        name: 'Dr. Ganesh Vulleru',
        expertProfile: {
          specialization: 'Crop Protection & Agronomy',
          qualification: 'Ph.D. Plant Pathology, M.Sc. Agronomy',
          experienceYears: 8,
          institution: 'Acharya N.G. Ranga Agricultural University (ANGRAU)',
          areasOfExpertise: [
            'Crop Protection',
            'Plant Diseases',
            'Bacterial Blight',
            'Integrated Pest Management',
            'Soil Health',
          ],
          availabilityStatus: 'Available',
          availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          consultationModes: ['In-App Message', 'Audio Call', 'Video Session'],
          rating: 4.9,
          reviewsCount: 48,
          bio: 'Senior Agricultural Specialist specializing in pathology diagnosis, disease forecasting, and low-residue curative spray protocols for chili, cotton, and paddy crops.',
          isVerified: true,
        },
      },
    }
  );
  console.log('Successfully updated expert profile for Dr. Ganesh Vulleru');
  await mongoose.disconnect();
}

main().catch(console.error);
