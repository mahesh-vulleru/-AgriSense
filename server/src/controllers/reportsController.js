import Farm from '../models/Farm.js';
import Crop from '../models/Crop.js';
import reportsService from '../services/reportsService.js';
import { logger } from '../utils/logger.js';

export const reportsController = {
  /**
   * Helper to validate farm & crop ownership for security
   */
  async validateOwnership(farmerId, farmId, cropId) {
    if (farmId) {
      const farm = await Farm.findOne({ _id: farmId, owner: farmerId });
      if (!farm) {
        const error = new Error('Access denied: You do not have ownership of the specified farm parcel.');
        error.statusCode = 403;
        throw error;
      }
    }
    if (cropId) {
      const crop = await Crop.findOne({ _id: cropId, owner: farmerId });
      if (!crop) {
        const error = new Error('Access denied: You do not have ownership of the specified crop.');
        error.statusCode = 403;
        throw error;
      }
    }
  },

  /**
   * GET /api/reports/summary or /api/reports/overview
   */
  async getOverview(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { farmId, cropId, startDate, endDate } = req.query;

      await reportsController.validateOwnership(farmerId, farmId, cropId);

      const metrics = await reportsService.getOverviewMetrics(farmerId, {
        farmId,
        cropId,
        startDate,
        endDate,
      });

      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (err) {
      logger.error('Reports getOverview Error:', err);
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Failed to retrieve reports overview metrics',
      });
    }
  },

  /**
   * GET /api/reports/farms
   */
  async getFarmReports(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { farmId, startDate, endDate } = req.query;

      await reportsController.validateOwnership(farmerId, farmId, null);

      const data = await reportsService.getFarmReportsData(farmerId, {
        farmId,
        startDate,
        endDate,
      });

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      logger.error('Reports getFarmReports Error:', err);
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Failed to generate farm audit reports',
      });
    }
  },

  /**
   * GET /api/reports/crops
   */
  async getCropReports(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { farmId, cropId, startDate, endDate } = req.query;

      await reportsController.validateOwnership(farmerId, farmId, cropId);

      const data = await reportsService.getCropReportsData(farmerId, {
        farmId,
        cropId,
        startDate,
        endDate,
      });

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      logger.error('Reports getCropReports Error:', err);
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Failed to generate crop performance reports',
      });
    }
  },

  /**
   * GET /api/reports/soil
   */
  async getSoilReports(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { farmId, startDate, endDate } = req.query;

      await reportsController.validateOwnership(farmerId, farmId, null);

      const data = await reportsService.getSoilReportsData(farmerId, {
        farmId,
        startDate,
        endDate,
      });

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      logger.error('Reports getSoilReports Error:', err);
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Failed to generate soil health reports',
      });
    }
  },

  /**
   * GET /api/reports/irrigation
   */
  async getIrrigationReports(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { farmId, cropId, startDate, endDate } = req.query;

      await reportsController.validateOwnership(farmerId, farmId, cropId);

      const data = await reportsService.getIrrigationReportsData(farmerId, {
        farmId,
        cropId,
        startDate,
        endDate,
      });

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      logger.error('Reports getIrrigationReports Error:', err);
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Failed to generate irrigation and water usage reports',
      });
    }
  },

  /**
   * GET /api/reports/weather
   */
  async getWeatherReports(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { farmId } = req.query;

      await reportsController.validateOwnership(farmerId, farmId, null);

      const data = await reportsService.getWeatherReportsData(farmerId, {
        farmId,
      });

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      logger.error('Reports getWeatherReports Error:', err);
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Failed to generate agro-meteorological reports',
      });
    }
  },

  /**
   * GET /api/reports/disease
   */
  async getDiseaseReports(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { farmId, cropId, startDate, endDate } = req.query;

      await reportsController.validateOwnership(farmerId, farmId, cropId);

      const data = await reportsService.getDiseaseReportsData(farmerId, {
        farmId,
        cropId,
        startDate,
        endDate,
      });

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      logger.error('Reports getDiseaseReports Error:', err);
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Failed to generate AI disease detection reports',
      });
    }
  },

  /**
   * GET /api/reports/export/csv
   */
  async exportCsv(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { category = 'overview', farmId, cropId, startDate, endDate } = req.query;

      await reportsController.validateOwnership(farmerId, farmId, cropId);

      let payload = null;
      if (category === 'overview') {
        payload = await reportsService.getOverviewMetrics(farmerId, { farmId, cropId, startDate, endDate });
      } else if (category === 'farms') {
        payload = await reportsService.getFarmReportsData(farmerId, { farmId, startDate, endDate });
      } else if (category === 'crops') {
        payload = await reportsService.getCropReportsData(farmerId, { farmId, cropId, startDate, endDate });
      } else if (category === 'soil') {
        payload = await reportsService.getSoilReportsData(farmerId, { farmId, startDate, endDate });
      } else if (category === 'irrigation') {
        payload = await reportsService.getIrrigationReportsData(farmerId, { farmId, cropId, startDate, endDate });
      } else if (category === 'disease') {
        payload = await reportsService.getDiseaseReportsData(farmerId, { farmId, cropId, startDate, endDate });
      } else {
        return res.status(400).json({ success: false, message: `Invalid report category '${category}' specified for CSV export.` });
      }

      const dateRangeStr = startDate && endDate ? `${startDate} to ${endDate}` : startDate ? `From ${startDate}` : endDate ? `Until ${endDate}` : 'All Time';
      const csvString = await reportsService.generateCsvReport(category, payload, {
        farmerName: req.user.name,
        farmerEmail: req.user.email,
        dateRange: dateRangeStr,
      });

      const filename = `agrisense_${category}_report_${Date.now()}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csvString);
    } catch (err) {
      logger.error('Reports exportCsv Error:', err);
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Failed to export CSV report',
      });
    }
  },

  /**
   * GET /api/reports/export/pdf
   */
  async exportPdf(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { category = 'overview', farmId, cropId, startDate, endDate } = req.query;

      await reportsController.validateOwnership(farmerId, farmId, cropId);

      let payload = null;
      if (category === 'overview') {
        payload = await reportsService.getOverviewMetrics(farmerId, { farmId, cropId, startDate, endDate });
      } else if (category === 'crops') {
        payload = await reportsService.getCropReportsData(farmerId, { farmId, cropId, startDate, endDate });
      } else if (category === 'soil') {
        payload = await reportsService.getSoilReportsData(farmerId, { farmId, startDate, endDate });
      } else if (category === 'irrigation') {
        payload = await reportsService.getIrrigationReportsData(farmerId, { farmId, cropId, startDate, endDate });
      } else if (category === 'disease') {
        payload = await reportsService.getDiseaseReportsData(farmerId, { farmId, cropId, startDate, endDate });
      } else {
        payload = await reportsService.getOverviewMetrics(farmerId, { farmId, cropId, startDate, endDate });
      }

      const dateRangeStr = startDate && endDate ? `${startDate} to ${endDate}` : startDate ? `From ${startDate}` : endDate ? `Until ${endDate}` : 'All Time';
      const pdfBuffer = await reportsService.generatePdfReport(category, payload, {
        farmerName: req.user.name,
        farmerEmail: req.user.email,
        dateRange: dateRangeStr,
      });

      const filename = `agrisense_${category}_report_${Date.now()}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.status(200).send(pdfBuffer);
    } catch (err) {
      logger.error('Reports exportPdf Error:', err);
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Failed to generate PDF report',
      });
    }
  },
};

export default reportsController;
