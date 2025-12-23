/**
 * River Analysis Module
 * Hydrodynamic calculations for erosion and sedimentation risk
 */

/**
 * Calculate flow depth using Manning's equation
 * @param {number} discharge - Water discharge (m³/s)
 * @param {number} channelWidth - Channel width (m)
 * @param {number} manningN - Manning's roughness coefficient
 * @param {number} baseSlope - Channel slope (m/m)
 * @returns {number} Flow depth (m)
 */
function calculateFlowDepth(discharge, channelWidth, manningN, baseSlope) {
    if (!baseSlope || baseSlope === 0) {
        return 1.5; // Default depth
    }
    return Math.pow((discharge * manningN) / (channelWidth * Math.sqrt(baseSlope)), 0.6);
}

/**
 * Calculate hydraulic radius
 * @param {number} channelWidth - Channel width (m)
 * @param {number} flowDepth - Flow depth (m)
 * @returns {number} Hydraulic radius (m)
 */
function calculateHydraulicRadius(channelWidth, flowDepth) {
    const area = channelWidth * flowDepth;
    const wettedPerimeter = channelWidth + 2 * flowDepth;
    return area / wettedPerimeter;
}

/**
 * Calculate flow velocity using Manning's equation
 * @param {number} hydraulicRadius - Hydraulic radius (m)
 * @param {number} manningN - Manning's roughness coefficient
 * @param {number} baseSlope - Channel slope (m/m)
 * @returns {number} Velocity (m/s)
 */
function calculateVelocity(hydraulicRadius, manningN, baseSlope) {
    return (1 / manningN) * Math.pow(hydraulicRadius, 2 / 3) * Math.pow(baseSlope, 1 / 2);
}

/**
 * Calculate shear stress
 * @param {number} hydraulicRadius - Hydraulic radius (m)
 * @param {number} baseSlope - Channel slope (m/m)
 * @param {number} curvature - Curvature multiplier (1.0-2.5)
 * @param {number} waterDensity - Water density (kg/m³)
 * @param {number} gravity - Gravity acceleration (m/s²)
 * @returns {number} Shear stress (Pa)
 */
function calculateShearStress(hydraulicRadius, baseSlope, curvature, waterDensity = 1000, gravity = 9.81) {
    return waterDensity * gravity * hydraulicRadius * baseSlope * curvature;
}

/**
 * Calculate vegetation resistance factor
 * @param {number} vegDensity - Vegetation density (0-1.0)
 * @returns {number} Resistance multiplier
 */
function calculateVegetationResistance(vegDensity) {
    return 1 + (vegDensity * 0.5);
}

/**
 * Calculate adjusted critical shear stress
 * @param {number} criticalShear - Base critical shear stress (Pa)
 * @param {number} vegDensity - Vegetation density (0-1.0)
 * @returns {number} Adjusted critical shear stress (Pa)
 */
function calculateAdjustedCriticalShear(criticalShear, vegDensity) {
    const resistance = calculateVegetationResistance(vegDensity);
    return criticalShear * resistance;
}

/**
 * Calculate risk index
 * @param {number} shearStress - Calculated shear stress (Pa)
 * @param {number} adjustedCriticalShear - Adjusted critical shear stress (Pa)
 * @param {number} bankHeight - Bank height (m)
 * @returns {number} Risk index
 */
function calculateRiskIndex(shearStress, adjustedCriticalShear, bankHeight) {
    let riskIndex = shearStress / adjustedCriticalShear;
    
    // Bank height amplification factor
    if (bankHeight > 10 && riskIndex > 1.0) {
        riskIndex *= (1 + (bankHeight - 10) / 20);
    }
    
    return riskIndex;
}

/**
 * Determine risk category based on risk index
 * @param {number} riskIndex - Calculated risk index
 * @returns {string} Risk category name
 */
function getRiskCategory(riskIndex) {
    if (riskIndex > 1.5) return 'High Erosion';
    if (riskIndex > 1.1) return 'Medium Erosion';
    if (riskIndex < 0.6) return 'High Deposition';
    if (riskIndex < 0.9) return 'Medium Deposition';
    return 'Stable';
}

/**
 * Calculate complete risk profile for a river segment
 * @param {object} feature - GeoJSON Feature with river segment properties
 * @param {number} discharge - Water discharge (m³/s)
 * @param {object} params - Hydrodynamic parameters
 * @returns {object} Feature with calculated properties
 */
function calculateSegmentRisk(feature, discharge, params = {}) {
    const props = feature.properties;
    
    // Get parameters with defaults
    const channelWidth = props.channel_width || 200;
    const manningN = props.manning_n || 0.035;
    const baseSlope = props.base_slope || 0.0005;
    const criticalShear = props.critical_shear || 2.5;
    const curvature = props.curvature || 1.0;
    const bankHeight = props.lidar_avg_bank_height_m || 10.0;
    const vegDensity = props.lidar_riparian_veg_density || 0.5;
    
    const waterDensity = params.waterDensity || 1000;
    const gravity = params.gravity || 9.81;
    
    // Validate inputs
    if (!channelWidth || channelWidth <= 0) {
        return feature; // Skip invalid segment
    }
    
    // Calculate hydrodynamic properties
    const flowDepth = calculateFlowDepth(discharge, channelWidth, manningN, baseSlope);
    const hydraulicRadius = calculateHydraulicRadius(channelWidth, flowDepth);
    const velocity = calculateVelocity(hydraulicRadius, manningN, baseSlope);
    let shearStress = calculateShearStress(hydraulicRadius, baseSlope, curvature, waterDensity, gravity);
    
    // Calculate risk
    const vegetationResistance = calculateVegetationResistance(vegDensity);
    const adjustedCriticalShear = calculateAdjustedCriticalShear(criticalShear, vegDensity);
    const riskIndex = calculateRiskIndex(shearStress, adjustedCriticalShear, bankHeight);
    const riskCategory = getRiskCategory(riskIndex);
    
    // Add calculated properties to feature
    feature.properties.calculated = {
        riskIndex: parseFloat(riskIndex.toFixed(2)),
        riskCategory: riskCategory,
        shearStress: parseFloat(shearStress.toFixed(2)),
        velocity: parseFloat(velocity.toFixed(2)),
        flowDepth: parseFloat(flowDepth.toFixed(2)),
        hydraulicRadius: parseFloat(hydraulicRadius.toFixed(2)),
        bankHeight: bankHeight,
        vegDensity: vegDensity,
        vegetationResistance: parseFloat(vegetationResistance.toFixed(2)),
        adjustedCriticalShear: parseFloat(adjustedCriticalShear.toFixed(2))
    };
    
    return feature;
}

/**
 * Calculate risk profile for all river segments
 * @param {number} discharge - Water discharge (m³/s)
 * @param {object} geojsonData - GeoJSON FeatureCollection
 * @param {object} params - Hydrodynamic parameters
 * @returns {object} Updated GeoJSON with calculated properties
 */
function calculateRiskProfile(discharge, geojsonData, params = {}) {
    if (!geojsonData || !geojsonData.features) {
        console.error('Invalid GeoJSON data');
        return geojsonData;
    }
    
    const updatedFeatures = geojsonData.features.map(feature => {
        return calculateSegmentRisk(feature, discharge, params);
    });
    
    return {
        ...geojsonData,
        features: updatedFeatures
    };
}

/**
 * Get statistics from analyzed data
 * @param {object} geojsonData - GeoJSON with calculated properties
 * @returns {object} Statistics object
 */
function getAnalysisStatistics(geojsonData) {
    if (!geojsonData || !geojsonData.features) {
        return null;
    }
    
    let stats = {
        totalSegments: 0,
        highErosion: 0,
        mediumErosion: 0,
        stable: 0,
        mediumDeposition: 0,
        highDeposition: 0,
        avgRiskIndex: 0,
        maxRiskIndex: -Infinity,
        minRiskIndex: Infinity,
        avgVelocity: 0,
        avgShearStress: 0
    };
    
    let totalRiskIndex = 0;
    let totalVelocity = 0;
    let totalShearStress = 0;
    
    geojsonData.features.forEach(feature => {
        if (!feature.properties.calculated) return;
        
        const calc = feature.properties.calculated;
        stats.totalSegments++;
        
        // Count by category
        switch (calc.riskCategory) {
            case 'High Erosion':
                stats.highErosion++;
                break;
            case 'Medium Erosion':
                stats.mediumErosion++;
                break;
            case 'Stable':
                stats.stable++;
                break;
            case 'Medium Deposition':
                stats.mediumDeposition++;
                break;
            case 'High Deposition':
                stats.highDeposition++;
                break;
        }
        
        // Calculate aggregates
        totalRiskIndex += calc.riskIndex;
        totalVelocity += calc.velocity;
        totalShearStress += calc.shearStress;
        
        stats.maxRiskIndex = Math.max(stats.maxRiskIndex, calc.riskIndex);
        stats.minRiskIndex = Math.min(stats.minRiskIndex, calc.riskIndex);
    });
    
    if (stats.totalSegments > 0) {
        stats.avgRiskIndex = parseFloat((totalRiskIndex / stats.totalSegments).toFixed(2));
        stats.avgVelocity = parseFloat((totalVelocity / stats.totalSegments).toFixed(2));
        stats.avgShearStress = parseFloat((totalShearStress / stats.totalSegments).toFixed(2));
    }
    
    return stats;
}

export {
    calculateFlowDepth,
    calculateHydraulicRadius,
    calculateVelocity,
    calculateShearStress,
    calculateVegetationResistance,
    calculateAdjustedCriticalShear,
    calculateRiskIndex,
    getRiskCategory,
    calculateSegmentRisk,
    calculateRiskProfile,
    getAnalysisStatistics
};
