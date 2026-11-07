/**
 * AgriSense Soil Agronomy & Fertilizer Advisory Engine
 * 
 * Implements scientific soil health assessment and crop nutrient management
 * based on ICAR, agricultural extension benchmarks, and standard Soil Health Card reference ranges.
 */

export const CROP_NUTRIENT_PROFILES = {
  Rice: {
    category: 'Cereal',
    baseN: 100, // kg/ha
    baseP: 50,
    baseK: 50,
    preferredPH: { min: 5.5, max: 7.2 },
    biofertilizers: ['Azospirillum', 'Phosphobacteria (PSB)', 'Blue Green Algae'],
  },
  Wheat: {
    category: 'Cereal',
    baseN: 120,
    baseP: 60,
    baseK: 40,
    preferredPH: { min: 6.0, max: 7.5 },
    biofertilizers: ['Azotobacter', 'PSB'],
  },
  Maize: {
    category: 'Cereal',
    baseN: 120,
    baseP: 60,
    baseK: 50,
    preferredPH: { min: 5.8, max: 7.2 },
    biofertilizers: ['Azotobacter', 'PSB', 'Mycorrhiza'],
  },
  Cotton: {
    category: 'Fiber',
    baseN: 120,
    baseP: 60,
    baseK: 60,
    preferredPH: { min: 6.0, max: 8.0 },
    biofertilizers: ['Azotobacter', 'PSB'],
  },
  Sugarcane: {
    category: 'Cash Crop',
    baseN: 250,
    baseP: 100,
    baseK: 120,
    preferredPH: { min: 6.5, max: 7.8 },
    biofertilizers: ['Gluconacetobacter', 'PSB'],
  },
  Soybean: {
    category: 'Oilseeds',
    baseN: 25, // Legumes fix atmospheric N
    baseP: 60,
    baseK: 40,
    preferredPH: { min: 6.0, max: 7.5 },
    biofertilizers: ['Bradyrhizobium japonicum', 'PSB'],
  },
  Groundnut: {
    category: 'Oilseeds',
    baseN: 25,
    baseP: 50,
    baseK: 75,
    preferredPH: { min: 5.8, max: 7.0 },
    biofertilizers: ['Rhizobium', 'PSB'],
  },
  Tomato: {
    category: 'Vegetable',
    baseN: 150,
    baseP: 100,
    baseK: 100,
    preferredPH: { min: 6.0, max: 7.0 },
    biofertilizers: ['Azotobacter', 'PSB', 'Trichoderma'],
  },
  Potato: {
    category: 'Vegetable',
    baseN: 150,
    baseP: 100,
    baseK: 120,
    preferredPH: { min: 5.2, max: 6.5 },
    biofertilizers: ['Azotobacter', 'PSB'],
  },
  Chili: {
    category: 'Vegetable',
    baseN: 120,
    baseP: 60,
    baseK: 60,
    preferredPH: { min: 6.0, max: 7.0 },
    biofertilizers: ['Azospirillum', 'PSB'],
  },
  Pulses: {
    category: 'Pulses',
    baseN: 20,
    baseP: 50,
    baseK: 20,
    preferredPH: { min: 6.2, max: 7.5 },
    biofertilizers: ['Rhizobium', 'PSB'],
  },
  General: {
    category: 'General Field Crop',
    baseN: 100,
    baseP: 50,
    baseK: 50,
    preferredPH: { min: 6.0, max: 7.5 },
    biofertilizers: ['Azotobacter / Azospirillum', 'PSB'],
  },
};

/**
 * Assess soil pH status and assign scientific condition
 */
export function evaluatePH(pHValue) {
  if (pHValue === null || pHValue === undefined || isNaN(pHValue)) {
    return {
      value: null,
      rating: 'Not Measured',
      status: 'neutral',
      title: 'pH Not Measured',
      description: 'Soil reaction (pH) was not recorded in this analysis.',
      recommendation: 'Measure soil pH to understand nutrient availability and microbial suitability.',
    };
  }

  const val = Number(pHValue);
  if (val < 5.5) {
    return {
      value: val,
      rating: 'Strongly Acidic',
      status: 'critical',
      title: 'Strongly Acidic (pH < 5.5)',
      description: `Soil reaction (pH ${val}) is strongly acidic. At this pH, phosphorus is fixed into insoluble aluminum and iron phosphates, and microbial nitrification is severely impeded.`,
      recommendation: 'Apply agricultural limestone (calcium carbonate) or dolomite to raise soil pH toward the 6.2–6.8 range.',
      conditioner: 'Agricultural Lime (CaCO3) or Dolomitic Limestone',
    };
  }
  if (val < 6.5) {
    return {
      value: val,
      rating: 'Moderately Acidic',
      status: 'warning',
      title: 'Moderately Acidic (pH 5.5 - 6.5)',
      description: `Soil reaction (pH ${val}) is slightly to moderately acidic. Suitable for crops like potato, tea, or maize, but may limit phosphorus efficiency in sensitive legumes.`,
      recommendation: 'Apply well-decomposed organic matter and monitor phosphorus availability.',
      conditioner: 'Light Liming or Organic Compost',
    };
  }
  if (val <= 7.5) {
    return {
      value: val,
      rating: 'Neutral / Optimal',
      status: 'optimal',
      title: 'Neutral & Optimal (pH 6.5 - 7.5)',
      description: `Soil reaction (pH ${val}) is within the optimum agronomic range where major macro and secondary nutrients (N, P, K, Ca, Mg, S) exhibit maximum plant availability.`,
      recommendation: 'Maintain current organic soil management practices to preserve optimal soil buffering capacity.',
      conditioner: 'None needed',
    };
  }
  if (val <= 8.5) {
    return {
      value: val,
      rating: 'Moderately Alkaline',
      status: 'warning',
      title: 'Moderately Alkaline (pH 7.5 - 8.5)',
      description: `Soil reaction (pH ${val}) is moderately alkaline, typical of calcareous or black cotton soils. Potential risk of micronutrient precipitation (Zinc, Iron, Manganese, Boron).`,
      recommendation: 'Incorporate organic manure and apply chelated micronutrients (Zinc EDTA, Fe-EDDHA) as foliar or basal dressings.',
      conditioner: 'Farmyard Manure & Green Manuring',
    };
  }
  return {
    value: val,
    rating: 'Strongly Alkaline',
    status: 'critical',
    title: 'Strongly Alkaline / Sodic (pH > 8.5)',
    description: `Soil reaction (pH ${val}) indicates sodic or saline-sodic conditions with high exchangeable sodium percentage (ESP), causing soil dispersion, crusting, and poor water infiltration.`,
    recommendation: 'Apply agricultural gypsum (calcium sulfate) to displace exchangeable sodium, followed by good quality leaching water and drainage furrows.',
    conditioner: 'Agricultural Gypsum (CaSO4·2H2O)',
  };
}

/**
 * Assess soil available Nitrogen (kg/ha)
 */
export function evaluateNitrogen(nValue) {
  if (nValue === null || nValue === undefined || isNaN(nValue)) {
    return {
      value: null,
      rating: 'Not Measured',
      status: 'neutral',
      title: 'Nitrogen Not Measured',
      description: 'Available nitrogen was not tested.',
      recommendation: 'Include available Nitrogen in laboratory test for accurate urea scheduling.',
    };
  }

  const val = Number(nValue);
  if (val < 280) {
    return {
      value: val,
      unit: 'kg/ha',
      rating: 'Low',
      status: 'critical',
      title: 'Low Available Nitrogen (< 280 kg/ha)',
      description: `Available Nitrogen of ${val} kg/ha is below the standard sufficiency threshold (280 kg/ha). Crops are prone to stunted vegetative growth, low tillering, and general chlorosis.`,
      recommendation: 'Supplement basal nitrogen by 25% or incorporate green manuring crops (Sesbania/Dhaincha) and compost.',
    };
  }
  if (val <= 560) {
    return {
      value: val,
      unit: 'kg/ha',
      rating: 'Medium',
      status: 'optimal',
      title: 'Medium / Sufficient Nitrogen (280 - 560 kg/ha)',
      description: `Available Nitrogen of ${val} kg/ha is within the optimal fertility range for standard seasonal crop production.`,
      recommendation: 'Follow standard recommended split nitrogen applications (e.g. 50% basal, 25% tillering, 25% panicle/flowering).',
    };
  }
  return {
    value: val,
    unit: 'kg/ha',
    rating: 'High',
    status: 'warning',
    title: 'High Available Nitrogen (> 560 kg/ha)',
    description: `Available Nitrogen of ${val} kg/ha is elevated. Excessive nitrogen can cause rank vegetative growth, crop lodging, delayed reproductive maturity, and heightened pest/aphid susceptibility.`,
    recommendation: 'Reduce synthetic nitrogen / urea applications by 25–40% to prevent luxury consumption and vegetative lodging.',
  };
}

/**
 * Assess soil available Phosphorus (kg/ha P2O5 / available P)
 */
export function evaluatePhosphorus(pValue) {
  if (pValue === null || pValue === undefined || isNaN(pValue)) {
    return {
      value: null,
      rating: 'Not Measured',
      status: 'neutral',
      title: 'Phosphorus Not Measured',
      description: 'Available phosphorus was not tested.',
      recommendation: 'Test available phosphorus to avoid stunted root formation.',
    };
  }

  const val = Number(pValue);
  if (val < 10) {
    return {
      value: val,
      unit: 'kg/ha',
      rating: 'Low',
      status: 'critical',
      title: 'Low Available Phosphorus (< 10 kg/ha)',
      description: `Available Phosphorus of ${val} kg/ha is low (< 10 kg/ha threshold). Deficiencies cause restricted root establishment, purplish leaf discoloration, and delayed flowering.`,
      recommendation: 'Apply basal phosphate fertilizers (DAP or Single Super Phosphate) and inoculate seeds with Phosphorus Solubilizing Bacteria (PSB).',
    };
  }
  if (val <= 25) {
    return {
      value: val,
      unit: 'kg/ha',
      rating: 'Medium',
      status: 'optimal',
      title: 'Medium / Sufficient Phosphorus (10 - 25 kg/ha)',
      description: `Available Phosphorus of ${val} kg/ha supports healthy root proliferation, nodulation in legumes, and energy transfer (ATP).`,
      recommendation: 'Maintain standard basal phosphate application placed near seed depth.',
    };
  }
  return {
    value: val,
    unit: 'kg/ha',
    rating: 'High',
    status: 'good',
    title: 'High Available Phosphorus (> 25 kg/ha)',
    description: `Available Phosphorus of ${val} kg/ha is abundant. High soil P can occasionally antagonize zinc and iron absorption in high-pH soils.`,
    recommendation: 'Maintain maintenance dosage only or skip phosphate in rotation crops to balance soil reserve.',
  };
}

/**
 * Assess soil available Potassium (kg/ha K2O)
 */
export function evaluatePotassium(kValue) {
  if (kValue === null || kValue === undefined || isNaN(kValue)) {
    return {
      value: null,
      rating: 'Not Measured',
      status: 'neutral',
      title: 'Potassium Not Measured',
      description: 'Available potassium was not tested.',
      recommendation: 'Test available potassium for drought tolerance and disease resilience diagnostics.',
    };
  }

  const val = Number(kValue);
  if (val < 110) {
    return {
      value: val,
      unit: 'kg/ha',
      rating: 'Low',
      status: 'critical',
      title: 'Low Available Potassium (< 110 kg/ha)',
      description: `Available Potassium of ${val} kg/ha is below the 110 kg/ha baseline. Crops may display marginal leaf necrosis (tip scorching), weak stems, and reduced drought tolerance.`,
      recommendation: 'Apply Muriate of Potash (MOP) or Sulfate of Potash (SOP) split between basal and vegetative stages.',
    };
  }
  if (val <= 280) {
    return {
      value: val,
      unit: 'kg/ha',
      rating: 'Medium',
      status: 'optimal',
      title: 'Medium / Sufficient Potassium (110 - 280 kg/ha)',
      description: `Available Potassium of ${val} kg/ha is balanced. Supports enzyme activation, stomatal regulation, and grain/fruit filling.`,
      recommendation: 'Provide standard crop maintenance potassic fertilization.',
    };
  }
  return {
    value: val,
    unit: 'kg/ha',
    rating: 'High',
    status: 'good',
    title: 'High Available Potassium (> 280 kg/ha)',
    description: `Available Potassium of ${val} kg/ha is rich. Abundant K improves stem strength and disease resistance.`,
    recommendation: 'Limit potassic top dressings; monitor Magnesium and Calcium uptake in demanding crops.',
  };
}

/**
 * Assess Soil Organic Carbon (%)
 */
export function evaluateOrganicCarbon(ocValue) {
  if (ocValue === null || ocValue === undefined || isNaN(ocValue)) {
    return {
      value: null,
      rating: 'Not Measured',
      status: 'neutral',
      title: 'Organic Carbon Not Measured',
      description: 'Soil organic carbon was not tested.',
      recommendation: 'Test Organic Carbon (OC) to gauge biological soil health and water retention.',
    };
  }

  const val = Number(ocValue);
  if (val < 0.2) {
    return {
      value: val,
      unit: '%',
      rating: 'Very Low',
      status: 'critical',
      title: 'Very Low Organic Carbon (< 0.2%)',
      description: `Soil Organic Carbon of ${val}% indicates acute biological depletion, minimal humus content, poor moisture retention, and high compaction.`,
      recommendation: 'Urgent incorporation of 4–5 tonnes/acre of well-rotted farmyard manure (FYM), vermicompost, and practice zero-residue burning.',
    };
  }
  if (val < 0.5) {
    return {
      value: val,
      unit: '%',
      rating: 'Low',
      status: 'warning',
      title: 'Low Organic Carbon (0.2 - 0.5%)',
      description: `Soil Organic Carbon of ${val}% is below recommended tropical/subtropical baseline (0.50%). Microbial activity and cation exchange capacity (CEC) are sub-optimal.`,
      recommendation: 'Incorporate 2–3 tonnes/acre of compost, retain crop stubble, and introduce green manuring (Dhaincha/Sunn hemp).',
    };
  }
  if (val <= 0.75) {
    return {
      value: val,
      unit: '%',
      rating: 'Medium',
      status: 'optimal',
      title: 'Medium Organic Carbon (0.50 - 0.75%)',
      description: `Soil Organic Carbon of ${val}% provides healthy microbial activity, stable soil aggregates, and adequate moisture buffer.`,
      recommendation: 'Maintain crop residue mulching and annual organic amendments.',
    };
  }
  return {
    value: val,
    unit: '%',
    rating: 'High',
    status: 'optimal',
    title: 'High Organic Carbon (> 0.75%)',
    description: `Soil Organic Carbon of ${val}% is excellent. Outstanding soil health, water retention, microbial diversity, and soil structure.`,
    recommendation: 'Continue sustainable conservation tillage and organic recycling.',
  };
}

/**
 * Assess Electrical Conductivity / Salinity (dS/m)
 */
export function evaluateElectricalConductivity(ecValue) {
  if (ecValue === null || ecValue === undefined || isNaN(ecValue)) {
    return {
      value: null,
      rating: 'Not Measured',
      status: 'neutral',
      title: 'Electrical Conductivity Not Measured',
      description: 'Electrical conductivity (salinity index) was not recorded.',
      recommendation: 'Test EC to evaluate potential salinity hazards before planting salt-sensitive crops.',
    };
  }

  const val = Number(ecValue);
  if (val < 0.8) {
    return {
      value: val,
      unit: 'dS/m',
      rating: 'Non-saline',
      status: 'optimal',
      title: 'Non-Saline / Normal (< 0.8 dS/m)',
      description: `Soil electrical conductivity of ${val} dS/m is safe. No osmotic inhibition of root water absorption.`,
      recommendation: 'Safe for all agronomic and horticultural crop varieties.',
    };
  }
  if (val <= 1.6) {
    return {
      value: val,
      unit: 'dS/m',
      rating: 'Slightly Saline',
      status: 'warning',
      title: 'Slightly Saline (0.8 - 1.6 dS/m)',
      description: `Soil electrical conductivity of ${val} dS/m indicates mild dissolved salt concentrations. Yields of sensitive crops (pulses, beans, strawberry) may be slightly restricted.`,
      recommendation: 'Ensure adequate irrigation water drainage and avoid water stagnation. Choose moderately salt-tolerant crop varieties.',
    };
  }
  if (val <= 2.5) {
    return {
      value: val,
      unit: 'dS/m',
      rating: 'Moderately Saline',
      status: 'critical',
      title: 'Moderately Saline (1.6 - 2.5 dS/m)',
      description: `Soil electrical conductivity of ${val} dS/m exhibits noticeable salinity stress. Crops experience osmotic drought even in moist soil.`,
      recommendation: 'Provide fresh water leaching, install tile/furrow drainage, and prioritize salinity-tolerant crops (e.g. barley, cotton, beet).',
    };
  }
  return {
    value: val,
    unit: 'dS/m',
    rating: 'Highly Saline',
    status: 'critical',
    title: 'Highly Saline (> 2.5 dS/m)',
    description: `Soil electrical conductivity of ${val} dS/m presents severe salinity hazards. Most traditional field crops will suffer severe stunting or germination failure.`,
    recommendation: 'Requires thorough soil reclamation, heavy drainage leaching with low-EC water, and organic green manure mulching.',
  };
}

/**
 * Evaluate optional Soil Moisture and Soil Temperature
 */
export function evaluateMoistureAndTemp(moisture, temp) {
  const result = {};

  if (moisture !== null && moisture !== undefined && !isNaN(moisture)) {
    const mVal = Number(moisture);
    let mStatus = 'optimal';
    let mDesc = 'Adequate soil root-zone moisture.';
    if (mVal < 15) {
      mStatus = 'warning';
      mDesc = 'Soil moisture is low (< 15%). Approaches temporary wilting point for light soils.';
    } else if (mVal > 35) {
      mStatus = 'warning';
      mDesc = 'High soil moisture (> 35%). Soil may be saturated; monitor for root asphyxiation.';
    }
    result.moisture = {
      value: mVal,
      unit: '%',
      status: mStatus,
      description: mDesc,
      measured: true,
    };
  } else {
    result.moisture = {
      value: null,
      measured: false,
      description: 'Soil moisture telemetry not recorded.',
    };
  }

  if (temp !== null && temp !== undefined && !isNaN(temp)) {
    const tVal = Number(temp);
    let tStatus = 'optimal';
    let tDesc = 'Soil temperature is favorable for root metabolism and nutrient assimilation (18°C–32°C).';
    if (tVal < 15) {
      tStatus = 'warning';
      tDesc = 'Cool soil temperatures (< 15°C) slow down phosphorus uptake and microbial mineralization.';
    } else if (tVal > 35) {
      tStatus = 'warning';
      tDesc = 'Elevated soil temperatures (> 35°C) increase soil evaporation and root respiratory stress.';
    }
    result.temperature = {
      value: tVal,
      unit: '°C',
      status: tStatus,
      description: tDesc,
      measured: true,
    };
  } else {
    result.temperature = {
      value: null,
      measured: false,
      description: 'Soil temperature telemetry not recorded.',
    };
  }

  return result;
}

/**
 * Comprehensive Soil Health Assessment
 * Analyzes all parameters, computes ratings, reasons, and overall status
 */
export function generateComprehensiveSoilHealth(soilRecord) {
  const pHVal = soilRecord.pH?.value !== undefined ? soilRecord.pH.value : soilRecord.pH;
  const nVal = soilRecord.nitrogen?.value !== undefined ? soilRecord.nitrogen.value : soilRecord.nitrogen;
  const pVal = soilRecord.phosphorus?.value !== undefined ? soilRecord.phosphorus.value : soilRecord.phosphorus;
  const kVal = soilRecord.potassium?.value !== undefined ? soilRecord.potassium.value : soilRecord.potassium;
  const ocVal = soilRecord.organicCarbon?.value !== undefined ? soilRecord.organicCarbon.value : soilRecord.organicCarbon;
  const ecVal = soilRecord.electricalConductivity?.value !== undefined ? soilRecord.electricalConductivity.value : soilRecord.electricalConductivity;
  const moistureVal = soilRecord.soilMoisture?.value !== undefined ? soilRecord.soilMoisture.value : soilRecord.soilMoisture;
  const tempVal = soilRecord.soilTemperature?.value !== undefined ? soilRecord.soilTemperature.value : soilRecord.soilTemperature;

  const phAssessment = evaluatePH(pHVal);
  const nAssessment = evaluateNitrogen(nVal);
  const pAssessment = evaluatePhosphorus(pVal);
  const kAssessment = evaluatePotassium(kVal);
  const ocAssessment = evaluateOrganicCarbon(ocVal);
  const ecAssessment = evaluateElectricalConductivity(ecVal);
  const telemetryAssessment = evaluateMoistureAndTemp(moistureVal, tempVal);

  // Count measured core parameters
  const measuredCoreParams = [
    phAssessment.value !== null,
    nAssessment.value !== null,
    pAssessment.value !== null,
    kAssessment.value !== null,
    ocAssessment.value !== null,
    ecAssessment.value !== null,
  ].filter(Boolean).length;

  let overallHealthStatus = 'Insufficient Data';
  let summary = '';
  const keyDeficiencies = [];
  const positiveAttributes = [];

  if (measuredCoreParams < 2) {
    overallHealthStatus = 'Insufficient Data';
    summary = 'Insufficient soil test parameters recorded. Please record at least pH and primary nutrients (NPK) to generate an agronomic soil health index.';
  } else {
    // Check critical flags
    const hasCritical =
      phAssessment.status === 'critical' ||
      nAssessment.status === 'critical' ||
      pAssessment.status === 'critical' ||
      kAssessment.status === 'critical' ||
      ocAssessment.status === 'critical' ||
      ecAssessment.status === 'critical';

    const hasWarning =
      phAssessment.status === 'warning' ||
      nAssessment.status === 'warning' ||
      pAssessment.status === 'warning' ||
      kAssessment.status === 'warning' ||
      ocAssessment.status === 'warning' ||
      ecAssessment.status === 'warning';

    if (nAssessment.status === 'critical') keyDeficiencies.push('Nitrogen Deficiency (< 280 kg/ha)');
    if (pAssessment.status === 'critical') keyDeficiencies.push('Phosphorus Deficiency (< 10 kg/ha)');
    if (kAssessment.status === 'critical') keyDeficiencies.push('Potassium Deficiency (< 110 kg/ha)');
    if (ocAssessment.status === 'critical') keyDeficiencies.push('Severe Organic Matter Depletion (< 0.2% OC)');
    if (phAssessment.status === 'critical') keyDeficiencies.push(`Unfavorable Soil pH (${phAssessment.rating})`);
    if (ecAssessment.status === 'critical') keyDeficiencies.push('Salinity Hazard (Elevated Electrical Conductivity)');

    if (phAssessment.status === 'optimal') positiveAttributes.push('Ideal pH Reaction');
    if (nAssessment.status === 'optimal') positiveAttributes.push('Balanced Available Nitrogen');
    if (pAssessment.status === 'optimal' || pAssessment.status === 'good') positiveAttributes.push('Adequate Phosphorus Reserves');
    if (kAssessment.status === 'optimal' || kAssessment.status === 'good') positiveAttributes.push('Strong Potassium Reserves');
    if (ocAssessment.status === 'optimal') positiveAttributes.push('Healthy Soil Organic Carbon');
    if (ecAssessment.status === 'optimal') positiveAttributes.push('Low Salinity / Non-saline');

    if (hasCritical) {
      overallHealthStatus = 'Needs Improvement';
      if (keyDeficiencies.length >= 3 || phAssessment.rating === 'Strongly Acidic' || phAssessment.rating === 'Strongly Alkaline' || ecAssessment.rating === 'Highly Saline') {
        overallHealthStatus = 'Degraded / Critical';
      }
    } else if (hasWarning) {
      overallHealthStatus = 'Moderately Healthy';
    } else {
      overallHealthStatus = 'Optimal';
    }

    if (overallHealthStatus === 'Optimal') {
      summary = `Soil conditions are in optimal balance across measured parameters. Nutrient bioavailability and pH buffer (${phAssessment.value || 'measured'}) support robust crop growth.`;
    } else if (overallHealthStatus === 'Moderately Healthy') {
      summary = `Soil health is generally productive but has mild variations. Priority: address ${keyDeficiencies[0] || 'minor micronutrient balance'} to maximize yield potential.`;
    } else if (overallHealthStatus === 'Needs Improvement') {
      summary = `Soil fertility exhibits notable constraints: ${keyDeficiencies.slice(0, 2).join(', ')}. Targeted soil amendments and balanced fertilization are recommended.`;
    } else {
      summary = `Critical soil health degradation detected: ${keyDeficiencies.join(', ')}. Soil requires structural reclamation, pH correction, and comprehensive organic enrichment.`;
    }
  }

  return {
    overallHealthStatus,
    assessmentSummary: summary,
    measuredParametersCount: measuredCoreParams,
    keyDeficiencies,
    positiveAttributes,
    parameters: {
      pH: phAssessment,
      nitrogen: nAssessment,
      phosphorus: pAssessment,
      potassium: kAssessment,
      organicCarbon: ocAssessment,
      electricalConductivity: ecAssessment,
      moisture: telemetryAssessment.moisture,
      temperature: telemetryAssessment.temperature,
    },
  };
}

/**
 * Generate Soil-Based Fertilizer & Soil Conditioner Guidance
 * Based on soil test, crop, growth stage, and acreage
 */
export function generateFertilizerRecommendations({
  soilAnalysis,
  cropName = 'General',
  cropStage = 'Sowing / Planting',
  acreage = 1,
}) {
  const cropProfile = CROP_NUTRIENT_PROFILES[cropName] || CROP_NUTRIENT_PROFILES.General;
  const numAcres = Math.max(0.1, Number(acreage) || 1);
  const areaHa = numAcres * 0.404686; // 1 acre ~ 0.4047 hectare

  const pH = soilAnalysis.pH?.value !== undefined ? soilAnalysis.pH.value : soilAnalysis.pH;
  const N = soilAnalysis.nitrogen?.value !== undefined ? soilAnalysis.nitrogen.value : soilAnalysis.nitrogen;
  const P = soilAnalysis.phosphorus?.value !== undefined ? soilAnalysis.phosphorus.value : soilAnalysis.phosphorus;
  const K = soilAnalysis.potassium?.value !== undefined ? soilAnalysis.potassium.value : soilAnalysis.potassium;
  const OC = soilAnalysis.organicCarbon?.value !== undefined ? soilAnalysis.organicCarbon.value : soilAnalysis.organicCarbon;

  // Base nutrient requirements in kg/ha
  let targetN = cropProfile.baseN;
  let targetP = cropProfile.baseP;
  let targetK = cropProfile.baseK;

  const explanations = [];

  // 1. Adjust Nitrogen requirement
  if (N !== null && N !== undefined && !isNaN(N)) {
    if (N < 280) {
      targetN = Math.round(targetN * 1.25);
      explanations.push(`Available Nitrogen (${N} kg/ha) is low. Recommended N dosage increased by 25% to overcome initial soil deficiency.`);
    } else if (N > 560) {
      targetN = Math.round(targetN * 0.70);
      explanations.push(`Available Nitrogen (${N} kg/ha) is high. Recommended N dosage reduced by 30% to prevent luxury vegetative growth, lodging, and pest attraction.`);
    } else {
      explanations.push(`Available Nitrogen (${N} kg/ha) is medium/optimal. Standard baseline N dosage is maintained.`);
    }
  } else {
    explanations.push('Available Nitrogen was not recorded. Using baseline crop nutritional requirement.');
  }

  // 2. Adjust Phosphorus requirement
  if (P !== null && P !== undefined && !isNaN(P)) {
    if (P < 10) {
      targetP = Math.round(targetP * 1.30);
      explanations.push(`Available Phosphorus (${P} kg/ha) is low. Phosphate recommendation increased by 30% to ensure vigorous early root branching.`);
    } else if (P > 25) {
      targetP = Math.round(targetP * 0.70);
      explanations.push(`Available Phosphorus (${P} kg/ha) is high. Phosphate dosage reduced by 30% to prevent excessive soil accumulation and zinc antagonism.`);
    } else {
      explanations.push(`Available Phosphorus (${P} kg/ha) is medium. Standard recommended P dosage applied.`);
    }
  }

  // 3. Adjust Potassium requirement
  if (K !== null && K !== undefined && !isNaN(K)) {
    if (K < 110) {
      targetK = Math.round(targetK * 1.25);
      explanations.push(`Available Potassium (${K} kg/ha) is low. Potash dosage increased by 25% to support stem strength and cellular osmotic regulation.`);
    } else if (K > 280) {
      targetK = Math.round(targetK * 0.75);
      explanations.push(`Available Potassium (${K} kg/ha) is high. Potash recommendation reduced by 25% to maintain nutrient balance.`);
    } else {
      explanations.push(`Available Potassium (${K} kg/ha) is medium. Standard potassic maintenance applied.`);
    }
  }

  // Convert nutrient demand from kg/ha to total field dosage (for given acreage)
  const fieldN_kg = Math.round(targetN * areaHa);
  const fieldP_kg = Math.round(targetP * areaHa);
  const fieldK_kg = Math.round(targetK * areaHa);

  // Common commercial fertilizer equivalencies:
  // Urea (46% N), DAP (18% N, 46% P2O5), MOP (60% K2O), SSP (16% P2O5)
  // Let's compute an indicative formulation based on DAP + Urea + MOP
  let dapDoseKg = 0;
  let ureaDoseKg = 0;
  let mopDoseKg = 0;

  if (fieldP_kg > 0) {
    dapDoseKg = Math.round(fieldP_kg / 0.46);
    const nFromDAP = Math.round(dapDoseKg * 0.18);
    const remainingN = Math.max(0, fieldN_kg - nFromDAP);
    ureaDoseKg = Math.round(remainingN / 0.46);
  } else {
    ureaDoseKg = Math.round(fieldN_kg / 0.46);
  }

  if (fieldK_kg > 0) {
    mopDoseKg = Math.round(fieldK_kg / 0.60);
  }

  // Growth Stage Distribution
  const stageGuidance = [];
  const normalizedStage = (cropStage || '').toLowerCase();

  if (normalizedStage.includes('land') || normalizedStage.includes('sowing') || normalizedStage.includes('planting')) {
    stageGuidance.push({
      timing: 'Current Stage (Basal Application at Sowing/Planting)',
      actions: [
        `Apply 100% of Phosphate requirement (${dapDoseKg} kg DAP) banded 5cm below and beside seed placement.`,
        `Apply 50% of Potash requirement (${Math.round(mopDoseKg * 0.5)} kg MOP) as basal dressing.`,
        `Apply 25% to 33% of Nitrogen requirement (${Math.round(ureaDoseKg * 0.3)} kg Urea) to stimulate seedling vigor.`,
      ],
    });
  } else if (normalizedStage.includes('vegetative') || normalizedStage.includes('tillering') || normalizedStage.includes('seedling')) {
    stageGuidance.push({
      timing: 'Current Stage (Active Vegetative Growth / Tillering)',
      actions: [
        `Top-dress 33% of Nitrogen requirement (${Math.round(ureaDoseKg * 0.33)} kg Urea) when soil has optimal moisture.`,
        'Ensure soil is not waterlogged before top-dressing to prevent volatilization and denitrification losses.',
        'If foliar pale leaves persist, consider 1% Zinc Sulfate spray or liquid bio-stimulant spray.',
      ],
    });
  } else if (normalizedStage.includes('flowering') || normalizedStage.includes('fruiting') || normalizedStage.includes('grain')) {
    stageGuidance.push({
      timing: 'Current Stage (Flowering & Grain/Fruit Formation)',
      actions: [
        `Apply remaining 33% Nitrogen (${Math.round(ureaDoseKg * 0.33)} kg Urea) and 50% Potash (${Math.round(mopDoseKg * 0.5)} kg MOP) for optimal grain filling.`,
        'Avoid excessive late-season nitrogen which can extend maturity and invite earhead bugs or mold.',
      ],
    });
  } else {
    stageGuidance.push({
      timing: 'Current Stage (Late Maturity / Harvest Preparation)',
      actions: [
        'Cease synthetic chemical fertilizer applications to permit natural dry-down and ripening.',
        'Plan post-harvest stubble incorporation and soil testing for the subsequent season.',
      ],
    });
  }

  // Soil Amendments & Conditioners
  const soilConditioners = [];
  if (pH !== null && pH !== undefined && !isNaN(pH)) {
    if (pH < 5.8) {
      soilConditioners.push({
        material: 'Agricultural Limestone (CaCO3) or Dolomite',
        estimatedDose: `${Math.round(150 * numAcres)} - ${Math.round(250 * numAcres)} kg`,
        purpose: 'Neutralizes soil acidity, reduces toxic aluminum activity, and restores exchangeable Calcium & Magnesium.',
      });
    } else if (pH > 8.2) {
      soilConditioners.push({
        material: 'Agricultural Gypsum (CaSO4·2H2O)',
        estimatedDose: `${Math.round(200 * numAcres)} - ${Math.round(350 * numAcres)} kg`,
        purpose: 'Supplies soluble Calcium to displace exchangeable Sodium ions, improving soil structure, flocculation, and permeability.',
      });
    }
  }

  // Organic & Bio-fertilizer recommendations
  const organicRecommendations = [];
  if (OC !== null && OC !== undefined && !isNaN(OC) && OC < 0.5) {
    organicRecommendations.push({
      material: 'Well-rotted Farmyard Manure (FYM) or Vermicompost',
      estimatedDose: `${Math.round(2 * numAcres)} - ${Math.round(4 * numAcres)} Tonnes`,
      purpose: 'Increases soil organic matter, stimulates beneficial microbial activity, and improves soil water-holding capacity.',
    });
  } else {
    organicRecommendations.push({
      material: 'Enriched Compost / FYM',
      estimatedDose: `${Math.round(1.5 * numAcres)} - ${Math.round(2 * numAcres)} Tonnes`,
      purpose: 'Annual organic maintenance to support soil biological ecosystem.',
    });
  }

  return {
    crop: cropName,
    cropStage,
    acreage: numAcres,
    areaHectares: Math.round(areaHa * 100) / 100,
    nutrientRequirements: {
      nitrogen_N_kg: fieldN_kg,
      phosphorus_P2O5_kg: fieldP_kg,
      potassium_K2O_kg: fieldK_kg,
    },
    indicativeCommercialFertilizers: {
      urea_46_N_kg: ureaDoseKg,
      dap_18_46_0_kg: dapDoseKg,
      mop_60_K2O_kg: mopDoseKg,
    },
    soilConditioners,
    organicRecommendations,
    biofertilizers: cropProfile.biofertilizers,
    stageGuidance,
    explanations,
    disclaimer:
      'NOTICE & AGRONOMIC DISCLAIMER: These fertilizer guidance calculations are scientific estimates derived from documented Soil Health Card standards and crop nutrient removal rates. Exact application schedules must account for local weather, irrigation water quality, and specific cultivar genetics. Consult your district Krishi Vigyan Kendra (KVK) or certified agricultural extension officer before broadacre chemical application.',
  };
}
