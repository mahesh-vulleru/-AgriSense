import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Check if real Gemini AI provider is configured with a valid key
 */
export function isGeminiConfigured() {
  const key = env.GEMINI_API_KEY;
  if (!key) return false;
  if (key === 'YOUR_GEMINI_API_KEY' || key === 'YOUR_API_KEY' || key.trim() === '') {
    return false;
  }
  return true;
}

/**
 * Analyze crop photograph using Google Gemini Multimodal model
 * 
 * @param {Object} options
 * @param {Buffer} options.imageBuffer - Image binary buffer
 * @param {string} options.mimeType - Image MIME type (image/jpeg, image/png, image/webp)
 * @param {Object} options.crop - Crop database record
 * @param {Object} options.farm - Farm database record
 * @param {Object} [options.environmentalContext] - Weather and soil observations
 * @returns {Promise<Object>} Structured disease analysis
 */
export async function analyzeCropDisease({
  imageBuffer,
  mimeType = 'image/jpeg',
  crop,
  farm,
  environmentalContext = {},
}) {
  if (!isGeminiConfigured()) {
    const error = new Error(
      'Gemini AI provider is not configured. Please specify a valid GEMINI_API_KEY in server/.env to enable live crop disease diagnosis.'
    );
    error.code = 'AI_SETUP_REQUIRED';
    error.statusCode = 503;
    throw error;
  }

  const modelName = env.AI_MODEL || 'gemini-2.5-flash';
  const apiKey = env.GEMINI_API_KEY;

  logger.info(`Initiating real Gemini multimodal disease diagnosis using model: ${modelName}`);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.2, // Low temperature for factual agronomic precision
      responseMimeType: 'application/json',
    },
  });

  const base64Image = imageBuffer.toString('base64');

  const cropName = crop?.name || 'General Agricultural Crop';
  const variety = crop?.variety || 'Standard';
  const growthStage = crop?.growthStage || 'Vegetative Growth';
  const location = farm?.location || farm?.district || 'India';
  const soilType = farm?.soilType || 'Loamy';

  const tempInfo = environmentalContext.temperature ? `${environmentalContext.temperature}°C` : 'Unknown';
  const humidityInfo = environmentalContext.humidity ? `${environmentalContext.humidity}%` : 'Unknown';
  const rainInfo = environmentalContext.recentRainfallMm !== null && environmentalContext.recentRainfallMm !== undefined
    ? `${environmentalContext.recentRainfallMm}mm`
    : 'Unknown';

  const systemPrompt = `You are a senior agricultural plant pathologist and certified agronomist examining a farmer's crop photograph.

FARM & CROP CONTEXT:
- Stated Crop: ${cropName} (Variety: ${variety})
- Growth Stage: ${growthStage}
- Farm Location: ${location}
- Soil Context: ${soilType} soil
- Environmental Conditions: Ambient Temp: ${tempInfo}, Relative Humidity: ${humidityInfo}, Recent Rain: ${rainInfo}

TASK:
Examine the uploaded image meticulously. Inspect:
1. Foliage color and abnormal discoloration (chlorosis, purpling, bronzing).
2. Visible spots, lesions, concentric rings, halos, shot-holes, or blights.
3. Leaf morphology changes: curling, cupping, wrinkling, stunting, or mosaic mottling.
4. Wilting, vascular collapse, or petiole droop.
5. Signs of fungal sporulation, powdery/downy mildew, rust pustules, or bacterial ooze.
6. Insect or mite feeding damage: stippling, chewing holes, galling, webbing, or frass.
7. Stem, collar, or fruit abnormalities if visible.

RULES & SCIENTIFIC INTEGRITY:
- If the image does not show plant foliage, stems, or crop parts (e.g. human selfie, machinery, indoor room, blurred photo), set "suitableForAnalysis": false, "status": "Unable to Determine", and explain clearly in "explanation".
- If the foliage shows no signs of pathogens, pests, or nutrient stress, set "status": "Healthy" and "possibleDisease": "Healthy / No Pathogen Detected". Do NOT fabricate a disease.
- Provide practical, real-world agronomic next steps (cultural practices, organic bio-controls like Trichoderma/Neem oil, and chemical fungicide/insecticide classes if appropriate).
- Output strictly a valid JSON object matching the schema below.

JSON OUTPUT SCHEMA:
{
  "identifiedCrop": "Name of crop visually identified from the photo",
  "suitableForAnalysis": true or false,
  "status": "Healthy" | "Diseased" | "Pest Damage" | "Nutrient Deficiency" | "Physiological Stress" | "Unable to Determine",
  "possibleDisease": "Primary identified disease/pest name (e.g. 'Chili Leaf Curl Virus' or 'Anthracnose Fruit Rot' or 'Healthy / No Pathogen Detected')",
  "visibleSymptoms": ["List of distinct visible physical symptoms on leaves, stems, or fruit"],
  "alternativeCauses": ["List of plausible secondary differentials or environmental mimics"],
  "explanation": "Clear, informative explanation of visible symptoms, etiology, and why this assessment was made",
  "suggestedActions": ["Step-by-step cultural, biological, or chemical corrective recommendations"],
  "expertVerificationNeeded": true,
  "confidenceNote": "Confidence not calibrated"
}`;

  try {
    const result = await model.generateContent([
      systemPrompt,
      {
        inlineData: {
          data: base64Image,
          mimeType,
        },
      },
    ]);

    const response = await result.response;
    const rawText = response.text();

    logger.info('Gemini AI multimodal response received successfully.');

    // Parse JSON
    let parsed;
    try {
      const cleanJson = rawText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch (parseErr) {
      logger.error('Failed to parse Gemini response as JSON:', rawText);
      throw new Error('Gemini AI returned a malformed response that could not be parsed.');
    }

    // Validate and normalize fields
    const validStatuses = [
      'Healthy',
      'Diseased',
      'Pest Damage',
      'Nutrient Deficiency',
      'Physiological Stress',
      'Unable to Determine',
    ];

    const normalizedStatus = validStatuses.includes(parsed.status) ? parsed.status : 'Unable to Determine';

    return {
      aiProvider: 'gemini',
      aiModel: modelName,
      identifiedCrop: parsed.identifiedCrop || cropName,
      suitableForAnalysis: Boolean(parsed.suitableForAnalysis),
      status: normalizedStatus,
      possibleDisease: parsed.possibleDisease || 'Unable to Determine',
      visibleSymptoms: Array.isArray(parsed.visibleSymptoms) ? parsed.visibleSymptoms : [],
      alternativeCauses: Array.isArray(parsed.alternativeCauses) ? parsed.alternativeCauses : [],
      explanation: parsed.explanation || 'No detailed explanation provided by the model.',
      suggestedActions: Array.isArray(parsed.suggestedActions) ? parsed.suggestedActions : [],
      expertVerificationNeeded: true,
      confidenceNote: 'Confidence not calibrated',
      rawMetadata: {
        model: modelName,
        candidatesCount: response.candidates?.length || 1,
        finishReason: response.candidates?.[0]?.finishReason || 'STOP',
      },
    };
  } catch (err) {
    logger.error('Gemini API Invocation Error:', err);

    // Differentiate error types
    if (err.status === 429 || err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      const quotaErr = new Error('Gemini AI rate limit reached or quota exhausted. Please try again in a few moments.');
      quotaErr.statusCode = 429;
      quotaErr.code = 'AI_RATE_LIMIT';
      throw quotaErr;
    }

    if (err.status === 400 || err.message?.includes('API_KEY_INVALID') || err.message?.includes('API key not valid')) {
      const keyErr = new Error('Invalid Gemini API key. Please check your GEMINI_API_KEY in server/.env.');
      keyErr.statusCode = 400;
      keyErr.code = 'AI_KEY_INVALID';
      throw keyErr;
    }

    if (err.code === 'AI_SETUP_REQUIRED') {
      throw err;
    }

    const genericErr = new Error(`Gemini AI service error: ${err.message || 'Unable to process crop image'}`);
    genericErr.statusCode = 502;
    throw genericErr;
  }
}
