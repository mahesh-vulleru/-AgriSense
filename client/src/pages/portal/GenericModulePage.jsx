import { useLocation } from 'react-router-dom';
import {
  Sprout,
  Activity,
  Droplets,
  CloudSun,
  ScanEye,
  BarChart3,
  Bell,
  MessageSquare,
  User,
  Settings,
  Users,
  Tractor,
  Layers,
  Cpu,
} from 'lucide-react';
import ModulePlaceholder from '../../components/common/ModulePlaceholder.jsx';

const moduleConfigs = {
  // Farmer Routes
  '/dashboard/crops': {
    title: 'Crop Management',
    subtitle: 'Track sowing calendars, phenological growth stages, expected harvest yields, and crop rotation schedules.',
    category: 'Crop Science',
    phase: 'Phase 5 Core',
    status: 'Partially Implemented',
    journeyStep: 'Step 3 of 11 in Farmer Journey',
    prerequisite: 'A crop parcel must belong to an existing farmer-owned registered farm.',
    icon: Sprout,
    features: [
      { title: 'Crop Life Cycle Tracking', desc: 'Monitor seed germination, tillering, vegetative, flowering, and maturity stages.' },
      { title: 'Variety & Hybrid Registry', desc: 'Catalog seed varieties, yield potentials, and pest-resistance traits.' },
      { title: 'Harvest Forecasting', desc: 'Project expected yield per acre based on historical metrics and current vigor.' },
    ],
  },
  '/dashboard/monitoring': {
    title: 'Crop Telemetry & Sensor Monitoring',
    subtitle: 'Real-time multi-spectral vegetation indices (NDVI, NDRE) and drone sensor overlays.',
    category: 'IoT Telemetry',
    phase: 'Phase 6 Integration',
    status: 'UI Placeholder',
    journeyStep: 'Step 4 of 11 in Farmer Journey',
    prerequisite: 'Crop Monitoring strictly requires registered crop records and connected field telemetry sensors.',
    icon: Activity,
    features: [
      { title: 'NDVI Canopy Vigor', desc: 'Continuously calculate normalized difference vegetation index from drone imagery.' },
      { title: 'Growth Rate Analytics', desc: 'Compare weekly canopy expansion against regional benchmark curves.' },
      { title: 'Anomaly Spotting', desc: 'Flag zones experiencing unexpected biomass stress or water deficit.' },
    ],
  },
  '/dashboard/soil-analysis': {
    title: 'Soil Health & NPK Diagnostics',
    subtitle: 'Continuous underground sensor tracking for soil moisture, temperature, electrical conductivity, and N-P-K nutrient profiles.',
    category: 'Soil Science',
    phase: 'Phase 6 Integration',
    status: 'UI Placeholder',
    journeyStep: 'Step 5 of 11 in Farmer Journey',
    prerequisite: 'Soil Analysis must be associated with a registered farm parcel and relevant crop planting zone.',
    icon: Layers,
    features: [
      { title: 'Continuous NPK Sensing', desc: 'Telemetry tracking Nitrogen, Phosphorus, and Potassium levels in root zones.' },
      { title: 'Moisture Depth Profiling', desc: 'Readings at 10cm, 30cm, and 60cm depths to prevent over-leaching.' },
      { title: 'pH & Salinity Alerts', desc: 'Early warning when soil acidity drifts outside optimal crop absorption thresholds.' },
    ],
  },
  '/dashboard/weather': {
    title: 'Agro-Meteorology & Weather Alerts',
    subtitle: 'Hyper-local micro-climate forecasts with proactive alerts for frost, heavy rainfall, and heat stress.',
    category: 'Climate Intelligence',
    phase: 'Phase 7 Integration',
    status: 'UI Placeholder',
    journeyStep: 'Step 6 of 11 in Farmer Journey',
    prerequisite: 'Weather Advisory requires GPS coordinates or district location from your registered farms.',
    icon: CloudSun,
    features: [
      { title: '7-Day Spray Forecast', desc: 'Identify optimal wind and moisture windows for foliar nutrition and pest defense.' },
      { title: 'Early Storm & Hail Warning', desc: 'Severe weather push notifications with actionable mitigation steps.' },
      { title: 'Degree-Day Heat Units', desc: 'Accumulated Growing Degree Days (GDD) to predict pest emergence dates.' },
    ],
  },
  '/dashboard/irrigation': {
    title: 'Smart Automated Irrigation',
    subtitle: 'Evapo-transpiration based dynamic watering schedules and IoT valve automation.',
    category: 'Water Conservation',
    phase: 'Phase 7 Integration',
    status: 'UI Placeholder',
    journeyStep: 'Step 7 of 11 in Farmer Journey',
    prerequisite: 'Smart Irrigation combines crop water coefficients, real-time soil moisture, and meteorological rainfall forecasts.',
    icon: Droplets,
    features: [
      { title: 'Dynamic Run-Time Scheduling', desc: 'Automate pump cycle run-times based on soil moisture and ambient temperature.' },
      { title: 'Sector Valve Control', desc: 'Selectively activate drip or sprinkler solenoids in sectors needing water.' },
      { title: 'Water Consumption Metrics', desc: 'Quantify kiloliters saved through precision timing vs conventional flood methods.' },
    ],
  },
  '/dashboard/disease-detection': {
    title: 'AI Crop Disease Scanner',
    subtitle: 'Computer vision diagnostics for leaf symptom analysis, fungal rust, blight, and pest identification.',
    category: 'Computer Vision & AI',
    phase: 'Phase 8 Integration',
    status: 'UI Placeholder',
    journeyStep: 'Step 8 of 11 in Farmer Journey',
    prerequisite: 'AI Disease Scan accepts authentic crop leaf photographs and links detections to registered crops.',
    icon: ScanEye,
    features: [
      { title: 'Instant Mobile Leaf Scan', desc: 'Upload or capture leaf images with automated focal point isolation.' },
      { title: 'Symptom Match & Severity', desc: 'Identify blights, rusts, mildew, and nutritional chlorosis with confidence scores.' },
      { title: 'One-Click Expert Escalation', desc: 'Forward uncertain scans to verified agronomists for second opinions.' },
    ],
  },
  '/dashboard/reports': {
    title: 'Farm Analytics & Yield Reports',
    subtitle: 'Comprehensive seasonal audit reports, input cost tracking, and exportable compliance documentation.',
    category: 'Intelligence & Compliance',
    phase: 'Phase 10 Integration',
    status: 'UI Placeholder',
    journeyStep: 'Step 9 of 11 in Farmer Journey',
    prerequisite: 'Reports calculate real metrics using historical harvest data, farm sizes, and input logs.',
    icon: BarChart3,
    features: [
      { title: 'PDF / CSV Yield Export', desc: 'Generate multi-field summary reports for banks, insurers, and buyers.' },
      { title: 'Input Cost vs Yield Matrix', desc: 'Correlate fertilizer and water expenditures against actual metric ton yield.' },
      { title: 'Carbon & Sustainability Metrics', desc: 'Track resource conservation gains for green farming certifications.' },
    ],
  },
  '/dashboard/notifications': {
    title: 'Notifications & Advisory Center',
    subtitle: 'Centralized alerts for sensor threshold breaches, task reminders, and government scheme updates.',
    category: 'Communication Hub',
    phase: 'Phase 9 Integration',
    status: 'UI Placeholder',
    journeyStep: 'Step 10 of 11 in Farmer Journey',
    prerequisite: 'Notifications originate from real system triggers, telemetry threshold violations, and expert messages.',
    icon: Bell,
    features: [
      { title: 'Real-Time Sensor Breaches', desc: 'Alerts when soil moisture or ambient temperature drops below trigger levels.' },
      { title: 'Agronomist Messages', desc: 'Direct alerts when an expert answers a consultation request.' },
      { title: 'Scheduled Reminders', desc: 'Automated alerts for fertilizer application and weed scouting routines.' },
    ],
  },
  '/dashboard/consultation': {
    title: 'Expert Consultation Hub',
    subtitle: 'Direct dialogue with agricultural extension specialists, soil scientists, and certified agronomists.',
    category: 'Expert Network',
    phase: 'Phase 8 Integration',
    status: 'UI Placeholder',
    journeyStep: 'Step 11 of 11 in Farmer Journey',
    prerequisite: 'Consultation connects verified farmers with certified agronomy specialists.',
    icon: MessageSquare,
    features: [
      { title: 'Structured Question Builder', desc: 'Attach crop type, sowing date, recent photos, and soil readings to every question.' },
      { title: 'Certified Agronomist Matching', desc: 'Inquiries routed directly to regional specialists experienced with local crops.' },
      { title: 'Consultation Archive', desc: 'Searchable historical repository of all past advice and remedies.' },
    ],
  },
  '/dashboard/profile': {
    title: 'Farmer Profile & Preferences',
    subtitle: 'Personal profile, primary contact details, farming experience, and communication preferences.',
    category: 'Account Center',
    phase: 'Phase 2 Account Management',
    status: 'UI Placeholder',
    icon: User,
    features: [
      { title: 'Contact & Location Management', desc: 'Update village, district, state, and primary telephone contact.' },
      { title: 'Agronomic Preferences', desc: 'Set metric vs imperial units, regional language, and preferred crop alerts.' },
      { title: 'Security Credentials', desc: 'Manage password, multi-device sessions, and notification channels.' },
    ],
  },
  '/dashboard/settings': {
    title: 'System & Farm Configuration',
    subtitle: 'Manage sensor calibration offsets, notification delivery frequencies, and farm boundary units.',
    category: 'Configuration',
    phase: 'Phase 10 Integration',
    status: 'UI Placeholder',
    icon: Settings,
    features: [
      { title: 'Sensor Threshold Boundaries', desc: 'Fine-tune minimum and maximum soil moisture and temperature alarm trip points.' },
      { title: 'Integration Webhooks', desc: 'Connect third-party weather station APIs or automated irrigation pump hardware.' },
      { title: 'Data Retention & Privacy', desc: 'Configure telemetry logging resolution and data export schedules.' },
    ],
  },

  // Expert Routes
  '/expert/consultations': {
    title: 'Expert Consultations Queue',
    subtitle: 'All assigned farmer inquiries, symptom photos, and telemetry diagnostics awaiting your guidance.',
    category: 'Expert Advisory',
    phase: 'Phase 8 Integration',
    icon: MessageSquare,
    features: [
      { title: 'Priority Triage Queue', desc: 'Sort inquiries by urgency, crop risk level, and time elapsed since submission.' },
      { title: 'Photo & Diagnostic Inspector', desc: 'Zoom in on high-resolution leaf photos and review corresponding soil readings.' },
      { title: 'Advisory Formulation & Follow-up', desc: 'Draft dosage guidance, treatment regimens, and schedule 7-day follow-ups.' },
    ],
  },
  '/expert/profile': {
    title: 'Expert Agronomist Profile',
    subtitle: 'Specializations, accredited credentials, advisory history, and availability calendar.',
    category: 'Expert Network',
    phase: 'Phase 8 Integration',
    icon: User,
    features: [
      { title: 'Agronomy Credentials', desc: 'Degrees, state certifications, and agricultural extension affiliations.' },
      { title: 'Crop & Domain Specialization', desc: 'Specialties in cash crops, horticulture, soil pathology, or organic farming.' },
      { title: 'Consultation Performance', desc: 'Farmer review metrics, total resolved inquiries, and average response times.' },
    ],
  },

  // Admin Routes
  '/admin/users': {
    title: 'User Management & Access Control',
    subtitle: 'Provision, audit, and regulate accounts across Farmers, Agricultural Experts, and System Admins.',
    category: 'Platform Administration',
    phase: 'Administration Suite',
    icon: Users,
    features: [
      { title: 'Account Governance', desc: 'View, filter, and modify account statuses (Active, Inactive, Suspended).' },
      { title: 'Role Assignment', desc: 'Elevate verified agricultural professionals to the Expert tier with audit logging.' },
      { title: 'Security & Session Revocation', desc: 'Force logout and reset security tokens for compromised accounts.' },
    ],
  },
  '/admin/farmers': {
    title: 'Farmers Directory & Land Audit',
    subtitle: 'Surveillance of registered farm operators, total cultivated acreage, and regional distribution.',
    category: 'Platform Administration',
    phase: 'Administration Suite',
    icon: Tractor,
    features: [
      { title: 'Regional Farmer Census', desc: 'Map registered farmers by state, district, and village clusters.' },
      { title: 'Farm Ownership Overview', desc: 'Inspect farm count, average acreage, and active irrigation methods per farmer.' },
      { title: 'Direct Communications', desc: 'Broadcast advisory alerts to specific regional clusters of farmers.' },
    ],
  },
  '/admin/experts': {
    title: 'Agronomist & Expert Directory',
    subtitle: 'Review certified agricultural specialists, response latencies, and workload distribution.',
    category: 'Platform Administration',
    phase: 'Administration Suite',
    icon: Users,
    features: [
      { title: 'Accreditation Review', desc: 'Verify agronomy credentials and approve pending expert registrations.' },
      { title: 'Workload Balancing', desc: 'Monitor active queue sizes and reassign high-urgency inquiries when needed.' },
      { title: 'Quality Scoring', desc: 'Inspect farmer satisfaction feedback and adherence to advisory standards.' },
    ],
  },
  '/admin/farms': {
    title: 'Global Farm Registry',
    subtitle: 'Inspect every agricultural parcel registered in MongoDB with acreage, soil types, and crop diversity.',
    category: 'Platform Administration',
    phase: 'Administration Suite',
    icon: Tractor,
    features: [
      { title: 'Cross-Tenant Land Registry', desc: 'Query and review farm records across all registered user accounts.' },
      { title: 'Soil & Irrigation Analytics', desc: 'Aggregate breakdown of soil categories (Alluvial, Black, Red) and water methods.' },
      { title: 'Data Integrity Audit', desc: 'Detect orphaned farm records or duplicate geographical coordinates.' },
    ],
  },
  '/admin/crops': {
    title: 'Platform-wide Crop Oversight',
    subtitle: 'Aggregate insights into active crop distributions, seasonal sowing trends, and regional yield targets.',
    category: 'Platform Administration',
    phase: 'Administration Suite',
    icon: Sprout,
    features: [
      { title: 'Cultivation Diversity Heatmaps', desc: 'Visualize the most planted crops by acreage across all active farms.' },
      { title: 'Seasonal Sowing Trends', desc: 'Monitor Kharif, Rabi, and Zaid planting cycles in real time.' },
      { title: 'Yield Target Projections', desc: 'Benchmark expected metric tons per crop against national statistics.' },
    ],
  },
  '/admin/disease-detections': {
    title: 'Platform Disease Surveillance',
    subtitle: 'Central surveillance of AI disease scans, infection clusters, and regional pathogen outbreaks.',
    category: 'Epidemiological Surveillance',
    phase: 'Administration Suite',
    icon: ScanEye,
    features: [
      { title: 'Outbreak Heatmap', desc: 'Cluster detection of contagious crop pathogens to prevent regional epidemics.' },
      { title: 'AI Model Confusion Matrix', desc: 'Monitor model diagnostic accuracy vs agronomist-corrected diagnoses.' },
      { title: 'Pathogen Alert Dispatch', desc: 'Issue preventative spray alerts to surrounding farms within a 15km radius.' },
    ],
  },
  '/admin/consultations': {
    title: 'Consultation Management Oversight',
    subtitle: 'Monitor all farmer-expert dialogues, resolution times, and unanswered inquiries.',
    category: 'Platform Administration',
    phase: 'Administration Suite',
    icon: MessageSquare,
    features: [
      { title: 'SLA Tracking', desc: 'Ensure farmer questions receive an agronomist response within SLA guidelines.' },
      { title: 'Dialogue Transcript Audit', desc: 'Review consultation chat transcripts to ensure recommended inputs are compliant.' },
      { title: 'Direct Intervention', desc: 'Reassign stalled consultation threads to alternative available specialists.' },
    ],
  },
  '/admin/notifications': {
    title: 'Broadcast Notification Manager',
    subtitle: 'Dispatch platform-wide alerts, seasonal advisories, and emergency weather warnings.',
    category: 'Communication Dispatch',
    phase: 'Administration Suite',
    icon: Bell,
    features: [
      { title: 'Geo-Targeted Broadcasts', desc: 'Dispatch SMS and in-app alerts to farmers in specific districts or pin codes.' },
      { title: 'Government Subsidy Bulletins', desc: 'Publish agricultural grant and scheme announcements directly to dashboards.' },
      { title: 'Delivery & Open Rates', desc: 'Track receipt, push notification opens, and farmer engagement telemetry.' },
    ],
  },
  '/admin/reports': {
    title: 'System Intelligence & Global Reports',
    subtitle: 'Platform growth analytics, resource savings metrics, and institutional reporting.',
    category: 'Intelligence & Compliance',
    phase: 'Administration Suite',
    icon: BarChart3,
    features: [
      { title: 'Platform Growth Metrics', desc: 'Track Monthly Active Farmers, new farm registrations, and daily telemetry events.' },
      { title: 'Water & Resource Conservation', desc: 'Quantify cumulative water and fertilizer saved across all smart farms.' },
      { title: 'Exportable Board Summaries', desc: 'Generate multi-metric executive summaries in PDF and Excel formats.' },
    ],
  },
  '/admin/settings': {
    title: 'Platform Infrastructure & Security',
    subtitle: 'Database cluster parameters, API rate limits, JWT session lifespans, and audit configurations.',
    category: 'Platform Administration',
    phase: 'Administration Suite',
    icon: Settings,
    features: [
      { title: 'Cluster & Replica Connection Pools', desc: 'Inspect live MongoDB connection pooling and query performance.' },
      { title: 'Security & Rate Limiting Rules', desc: 'Configure maximum requests per IP and authentication attempt thresholds.' },
      { title: 'Audit Trail Retention', desc: 'Configure system logging levels and immutable security event logs.' },
    ],
  },
};

export const GenericModulePage = () => {
  const location = useLocation();
  const path = location.pathname;

  // Match path or remove trailing slash
  const cleanPath = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
  const config = moduleConfigs[cleanPath] || {
    title: 'AgriSense Intelligent Module',
    subtitle: 'This precision farming module is actively architected in the application workflow.',
    category: 'Precision Agriculture',
    phase: 'Next Phase',
    icon: Cpu,
    features: [
      { title: 'Integrated Data Pipeline', desc: 'Connects directly to your farm profiles and IoT telemetry streams.' },
      { title: 'Role-Based Synchronization', desc: 'Synchronized with your authenticated account role and regional settings.' },
    ],
  };

  const isExpertRoute = cleanPath.startsWith('/expert');
  const isAdminRoute = cleanPath.startsWith('/admin');
  const returnPath = isAdminRoute
    ? '/admin/dashboard'
    : isExpertRoute
    ? '/expert/dashboard'
    : '/dashboard';
  const returnLabel = isAdminRoute
    ? 'Admin Dashboard'
    : isExpertRoute
    ? 'Expert Dashboard'
    : 'Farmer Dashboard';

  return (
    <ModulePlaceholder
      title={config.title}
      subtitle={config.subtitle}
      category={config.category}
      phase={config.phase}
      status={config.status}
      journeyStep={config.journeyStep}
      prerequisite={config.prerequisite}
      icon={config.icon}
      features={config.features}
      returnPath={returnPath}
      returnLabel={returnLabel}
    />
  );
};

export default GenericModulePage;
