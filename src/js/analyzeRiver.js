/**
 * River Analysis Module
 * Hydrodynamic calculations for erosion and sedimentation risk
 */

/**
 * Calculate flow depth using Manning's equation
 */
function calculateFlowDepth(discharge, channelWidth, manningN, baseSlope) {
    if (!baseSlope || baseSlope === 0) {
        return 1.5;
    }
    return Math.pow((discharge * manningN) / (channelWidth * Math.sqrt(baseSlope)), 0.6);
}

/**
 * Calculate hydraulic radius
 */
function calculateHydraulicRadius(channelWidth, flowDepth) {
    const area = channelWidth * flowDepth;
    const wettedPerimeter = channelWidth + 2 * flowDepth;
    return area / wettedPerimeter;
}

/**
 * Calculate flow velocity using Manning's equation
 */
function calculateVelocity(hydraulicRadius, manningN, baseSlope) {
    return (1 / manningN) * Math.pow(hydraulicRadius, 2 / 3) * Math.pow(baseSlope, 1 / 2);
}

/**
 * Calculate shear stress
 */
function calculateShearStress(hydraulicRadius, baseSlope, curvature, waterDensity = 1000, gravity = 9.81) {
    return waterDensity * gravity * hydraulicRadius * baseSlope * curvature;
}

/**
 * Calculate vegetation resistance factor
 */
function calculateVegetationResistance(vegDensity) {
    return 1 + (vegDensity * 0.5);
}

/**
 * Calculate adjusted critical shear stress
 */
function calculateAdjustedCriticalShear(criticalShear, vegDensity) {
    const resistance = calculateVegetationResistance(vegDensity);
    return criticalShear * resistance;
}

/**
 * Calculate risk index
 */
function calculateRiskIndex(shearStress, adjustedCriticalShear, bankHeight) {
    let riskIndex = shearStress / adjustedCriticalShear;
    
    if (bankHeight > 10 && riskIndex > 1.0) {
        riskIndex *= (1 + (bankHeight - 10) / 20);
    }
    
    return riskIndex;
}

/**
 * Determine risk category based on risk index
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
 */
function calculateSegmentRisk(feature, discharge, params = {}) {
    const props = feature.properties;
    
    const channelWidth = props.channel_width || 200;
    const manningN = props.manning_n || 0.035;
    const baseSlope = props.base_slope || 0.0005;
    const criticalShear = props.critical_shear || 2.5;
    const curvature = props.curvature || 1.0;
    const bankHeight = props.lidar_avg_bank_height_m || 10.0;
    const vegDensity = props.lidar_riparian_veg_density || 0.5;
    
    const waterDensity = params.waterDensity || 1000;
    const gravity = params.gravity || 9.81;
    
    if (!channelWidth || channelWidth <= 0) {
        return feature;
    }
    
    const flowDepth = calculateFlowDepth(discharge, channelWidth, manningN, baseSlope);
    const hydraulicRadius = calculateHydraulicRadius(channelWidth, flowDepth);
    const velocity = calculateVelocity(hydraulicRadius, manningN, baseSlope);
    let shearStress = calculateShearStress(hydraulicRadius, baseSlope, curvature, waterDensity, gravity);
    
    const vegetationResistance = calculateVegetationResistance(vegDensity);
    const adjustedCriticalShear = calculateAdjustedCriticalShear(criticalShear, vegDensity);
    const riskIndex = calculateRiskIndex(shearStress, adjustedCriticalShear, bankHeight);
    const riskCategory = getRiskCategory(riskIndex);
    
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

console.log('Analysis module loaded');
