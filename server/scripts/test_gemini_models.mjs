import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY;
console.log('Using API key starting with:', apiKey?.slice(0, 8));

const genAI = new GoogleGenerativeAI(apiKey);

async function check() {
  const models = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-2.5-flash',
  ];

  for (const m of models) {
    try {
      const model = genAI.getGenerativeModel({ model: m });
      const res = await model.generateContent('ping');
      console.log('SUCCESS with model:', m, 'Response:', res.response.text().trim());
      return m;
    } catch (e) {
      console.log('FAILED with model:', m, '-->\n', e.message);
    }
  }
}

check().then((working) => {
  console.log('Working model found:', working);
  process.exit(0);
}).catch(console.error);
