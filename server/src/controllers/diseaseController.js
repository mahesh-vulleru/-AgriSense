import fs from 'fs';
import path from 'path';
import Farm from '../models/Farm.js';
import Crop from '../models/Crop.js';
import SoilAnalysis from '../models/SoilAnalysis.js';
import DiseaseScan from '../models/DiseaseScan.js';
import { analyzeCropDisease, isGeminiConfigured } from '../services/geminiDiseaseService.js';
import { getAgriculturalWeather } from '../services/weatherService.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const diseaseController = {
  /**
   * GET /api/disease-detection/status
   * Retrieve AI provider status, model name, and configuration state
   */
  async getStatus(req, res) {
    try {
      const configured = isGeminiConfigured();
      res.status(200).json({
        success: true,
        provider: process.env.AI_PROVIDER || env.AI_PROVIDER || 'gemini',
        model: (process.env.AI_MODEL || env.AI_MODEL || 'gemini-2.5-flash-lite').replace(/^gemini-2.5-flash$/, 'gemini-2.5-flash-lite'),
        configured,
        message: configured
          ? 'Google Gemini multimodal disease diagnosis engine is active.'
          : 'Gemini API key is not configured. Live disease diagnosis is disabled until configured in server/.env.',
        priorityCrops: ['Chili', 'Cotton', 'Rice', 'Sugarcane'],
      });
    } catch (err) {
      logger.error('Disease Status Check Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve AI provider status',
        error: err.message,
      });
    }
  },

  /**
   * POST /api/disease-detection/scan
   * Real image upload & camera capture AI analysis workflow
   */
  async scanCrop(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const {
        farmId,
        cropId,
        imageBase64,
        filename = 'crop_scan.jpg',
        captureMethod = 'upload',
        notes = '',
      } = req.body;

      if (!farmId || !cropId) {
        return res.status(400).json({
          success: false,
          message: 'Both Farm parcel and Crop selection are required for disease scanning.',
        });
      }

      if (!imageBase64 || typeof imageBase64 !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'A valid photograph image (base64 data URL) is required.',
        });
      }

      // Check format
      const match = imageBase64.match(/^data:image\/(jpeg|png|webp|jpg);base64,/i);
      if (!match) {
        return res.status(400).json({
          success: false,
          message: 'Unsupported image format. Allowed formats: JPEG, PNG, WEBP.',
        });
      }

      const rawMime = match[1].toLowerCase();
      const mimeType = rawMime === 'jpg' ? 'image/jpeg' : `image/${rawMime}`;
      const ext = rawMime === 'jpeg' ? 'jpg' : rawMime;

      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

      // Max size limit: 10MB
      const MAX_SIZE_BYTES = 10 * 1024 * 1024;
      if (imageBuffer.length > MAX_SIZE_BYTES) {
        return res.status(400).json({
          success: false,
          message: 'Image size exceeds maximum limit of 10MB.',
        });
      }

      // Verify farm ownership
      const farm = await Farm.findOne({ _id: farmId, owner: farmerId });
      if (!farm) {
        return res.status(404).json({
          success: false,
          message: 'Farm parcel not found or unauthorized access.',
        });
      }

      // Verify crop ownership and relationship with farm
      const crop = await Crop.findOne({ _id: cropId, owner: farmerId, farm: farmId });
      if (!crop) {
        return res.status(404).json({
          success: false,
          message: 'Selected crop does not belong to this farm parcel or user.',
        });
      }

      // Save image to server/uploads/disease_scans/
      const uploadDir = path.join(process.cwd(), 'uploads', 'disease_scans');
      await fs.promises.mkdir(uploadDir, { recursive: true });

      const uniqueFileName = `scan_${crop._id}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filePath = path.join(uploadDir, uniqueFileName);
      await fs.promises.writeFile(filePath, imageBuffer);

      const publicImageUrl = `/uploads/disease_scans/${uniqueFileName}`;

      // Collect environmental context (weather + soil)
      let environmentalContext = {
        temperature: null,
        humidity: null,
        recentRainfallMm: null,
        growthStage: crop.growthStage || 'Vegetative Growth',
        soilMoisture: '',
      };

      if (farm.coordinates?.latitude && farm.coordinates?.longitude) {
        try {
          const weather = await getAgriculturalWeather(farm.coordinates.latitude, farm.coordinates.longitude, farm);
          if (weather?.current) {
            environmentalContext.temperature = weather.current.temp;
            environmentalContext.humidity = weather.current.humidity;
            environmentalContext.recentRainfallMm = weather.rainfallSummary?.totalRainfallMm || 0;
          }
        } catch (wErr) {
          logger.warn('Weather fetch warning for disease scan context:', wErr.message);
        }
      }

      try {
        const soil = await SoilAnalysis.findOne({ farm: farm._id, farmer: farmerId }).sort({ sampleDate: -1 });
        if (soil?.soilMoisture?.value !== null && soil?.soilMoisture?.value !== undefined) {
          environmentalContext.soilMoisture = `${soil.soilMoisture.value}%`;
        }
      } catch (sErr) {
        logger.warn('Soil fetch warning for disease scan context:', sErr.message);
      }

      // Send actual image to Gemini AI
      const aiResult = await analyzeCropDisease({
        imageBuffer,
        mimeType,
        crop,
        farm,
        environmentalContext,
      });

      // Save scan record to database
      const scanRecord = new DiseaseScan({
        farmer: farmerId,
        farm: farm._id,
        crop: crop._id,
        image: {
          url: publicImageUrl,
          filename: filename || uniqueFileName,
          mimeType,
          sizeBytes: imageBuffer.length,
          captureMethod: captureMethod === 'camera' ? 'camera' : 'upload',
        },
        scanTimestamp: new Date(),
        aiProvider: aiResult.aiProvider,
        aiModel: aiResult.aiModel,
        status: aiResult.status,
        identifiedCrop: aiResult.identifiedCrop,
        suitableForAnalysis: aiResult.suitableForAnalysis,
        possibleDisease: aiResult.possibleDisease,
        visibleSymptoms: aiResult.visibleSymptoms,
        alternativeCauses: aiResult.alternativeCauses,
        explanation: aiResult.explanation,
        suggestedActions: aiResult.suggestedActions,
        expertVerificationNeeded: true,
        confidenceNote: aiResult.confidenceNote,
        environmentalContext,
        rawMetadata: aiResult.rawMetadata,
        notes: notes?.trim() || '',
      });

      await scanRecord.save();
      await scanRecord.populate('farm', '_id name location acreage');
      await scanRecord.populate('crop', '_id name variety growthStage category');

      logger.info(`Disease scan completed successfully for ${crop.name}: ${scanRecord.possibleDisease}`);

      res.status(201).json({
        success: true,
        message: 'Crop photograph analyzed successfully by Gemini AI',
        scan: scanRecord,
      });
    } catch (err) {
      logger.error('Crop Disease Scan Error:', err);
      const statusCode = err.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        code: err.code || 'AI_DIAGNOSIS_ERROR',
        message: err.message || 'Failed to analyze crop photograph.',
        error: err.message,
      });
    }
  },

  /**
   * GET /api/disease-detection/history
   * Retrieve historical disease scans with optional filters
   */
  async getHistory(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { farmId, cropId, status, limit = 50, page = 1 } = req.query;

      const query = { farmer: farmerId };
      if (farmId) query.farm = farmId;
      if (cropId) query.crop = cropId;
      if (status) query.status = status;

      const skip = (Math.max(1, Number(page)) - 1) * Math.min(100, Math.max(1, Number(limit)));
      const take = Math.min(100, Math.max(1, Number(limit)));

      const [scans, total] = await Promise.all([
        DiseaseScan.find(query)
          .sort({ scanTimestamp: -1 })
          .skip(skip)
          .limit(take)
          .populate('farm', '_id name location acreage')
          .populate('crop', '_id name variety growthStage category'),
        DiseaseScan.countDocuments(query),
      ]);

      res.status(200).json({
        success: true,
        count: scans.length,
        total,
        page: Number(page),
        scans,
      });
    } catch (err) {
      logger.error('Get Disease History Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve scan history',
        error: err.message,
      });
    }
  },

  /**
   * GET /api/disease-detection/history/:id
   * Retrieve individual scan record details
   */
  async getScanById(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { id } = req.params;

      const scan = await DiseaseScan.findOne({ _id: id, farmer: farmerId })
        .populate('farm', '_id name location acreage')
        .populate('crop', '_id name variety growthStage category');

      if (!scan) {
        return res.status(404).json({
          success: false,
          message: 'Disease scan record not found or unauthorized access.',
        });
      }

      res.status(200).json({
        success: true,
        scan,
      });
    } catch (err) {
      logger.error('Get Scan Details Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve scan record',
        error: err.message,
      });
    }
  },

  /**
   * DELETE /api/disease-detection/history/:id
   * Remove a scan record
   */
  async deleteScan(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { id } = req.params;

      const scan = await DiseaseScan.findOneAndDelete({ _id: id, farmer: farmerId });
      if (!scan) {
        return res.status(404).json({
          success: false,
          message: 'Disease scan record not found or unauthorized access.',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Disease scan record deleted successfully.',
        deletedId: id,
      });
    } catch (err) {
      logger.error('Delete Scan Record Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to delete scan record',
        error: err.message,
      });
    }
  },
};
