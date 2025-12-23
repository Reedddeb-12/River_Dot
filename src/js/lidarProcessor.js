/**
 * LiDAR Data Processing Module
 * Handles LiDAR data parsing and merging with river segments
 */

/**
 * Calculate distance between two points
 * @param {number} lat1 - First latitude
 * @param {number} lon1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lon2 - Second longitude
 * @returns {number} Distance in decimal degrees
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const dLat = Math.pow(lat2 - lat1, 2);
    const dLon = Math.pow(lon2 - lon1, 2);
    return Math.sqrt(dLat + dLon);
}

/**
 * Parse CSV text into array of objects
 * @param {string} csvText - CSV content as text
 * @returns {array} Array of objects with CSV data
 */
function parseCSVText(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length < 2) {
        throw new Error('CSV must contain header and at least one data row');
    }
    
    // Parse header
    const header = lines[0].split(',').map(h => h.trim());
    
    // Validate required columns
    const requiredColumns = ['segment_id', 'latitude', 'longitude'];
    const missingColumns = requiredColumns.filter(col => !header.includes(col));
    
    if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }
    
    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const obj = {};
        
        header.forEach((column, idx) => {
            const value = values[idx];
            
            // Try to parse as number
            if (!isNaN(value) && value !== '') {
                obj[column] = parseFloat(value);
            } else {
                obj[column] = value;
            }
        });
        
        // Only add if has required fields
        if (obj.segment_id && obj.latitude && obj.longitude) {
            data.push(obj);
        }
    }
    
    if (data.length === 0) {
        throw new Error('No valid data rows found in CSV');
    }
    
    return data;
}

/**
 * Process LiDAR CSV file
 * @param {string} csvText - CSV file content
 * @returns {array} Array of LiDAR point objects
 */
function processLidarCSV(csvText) {
    try {
        return parseCSVText(csvText);
    } catch (error) {
        console.error('Error processing LiDAR CSV:', error);
        throw new Error('Invalid LiDAR CSV format: ' + error.message);
    }
}

/**
 * Process LiDAR GeoJSON data
 * @param {object} geoJsonData - GeoJSON FeatureCollection
 * @returns {array} Array of LiDAR point objects
 */
function processLidarGeoJSON(geoJsonData) {
    if (!geoJsonData.features || !Array.isArray(geoJsonData.features)) {
        throw new Error('Invalid GeoJSON: features array required');
    }
    
    return geoJsonData.features.map(feature => {
        const props = feature.properties || {};
        const coords = feature.geometry?.coordinates || [];
        
        return {
            segment_id: props.segment_id || props.id,
            latitude: coords[1] || props.latitude,
            longitude: coords[0] || props.longitude,
            bank_height_m: props.bank_height_m || props.lidar_avg_bank_height_m,
            veg_density: props.veg_density || props.lidar_riparian_veg_density,
            bank_slope: props.bank_slope || props.lidar_bank_slope,
            roughness_coefficient: props.roughness_coefficient || props.manning_n,
            ...props
        };
    });
}

/**
 * Find nearest LiDAR point to a location
 * @param {number} lat - Target latitude
 * @param {number} lon - Target longitude
 * @param {array} lidarPoints - Array of LiDAR points
 * @returns {object} Nearest LiDAR point
 */
function findNearestLidarPoint(lat, lon, lidarPoints) {
    let nearestPoint = null;
    let minDistance = Infinity;
    
    lidarPoints.forEach(point => {
        const dist = calculateDistance(lat, lon, point.latitude, point.longitude);
        if (dist < minDistance) {
            minDistance = dist;
            nearestPoint = point;
        }
    });
    
    return nearestPoint;
}

/**
 * Get segment center from geometry
 * @param {object} geometry - GeoJSON geometry object
 * @returns {object} Center point with lat and lon
 */
function getSegmentCenter(geometry) {
    if (!geometry || !geometry.coordinates) {
        return null;
    }
    
    const coords = geometry.coordinates;
    let lat = 0, lon = 0;
    
    if (geometry.type === 'LineString') {
        const midIndex = Math.floor(coords.length / 2);
        return {
            latitude: coords[midIndex][1],
            longitude: coords[midIndex][0]
        };
    } else if (geometry.type === 'MultiLineString') {
        const midLineIndex = Math.floor(coords.length / 2);
        const midCoordIndex = Math.floor(coords[midLineIndex].length / 2);
        return {
            latitude: coords[midLineIndex][midCoordIndex][1],
            longitude: coords[midLineIndex][midCoordIndex][0]
        };
    }
    
    return null;
}

/**
 * Merge LiDAR data with river segments
 * @param {object} riverGeoJSON - River GeoJSON FeatureCollection
 * @param {array} lidarArray - Array of LiDAR points
 * @returns {object} River GeoJSON with updated LiDAR properties
 */
function mergeLidarWithRiver(riverGeoJSON, lidarArray) {
    if (!riverGeoJSON || !riverGeoJSON.features) {
        throw new Error('Invalid river GeoJSON');
    }
    
    if (!Array.isArray(lidarArray) || lidarArray.length === 0) {
        throw new Error('Invalid LiDAR data array');
    }
    
    const mergedFeatures = riverGeoJSON.features.map(feature => {
        const center = getSegmentCenter(feature.geometry);
        
        if (!center) {
            return feature;
        }
        
        // Find nearest LiDAR point
        const nearest = findNearestLidarPoint(center.latitude, center.longitude, lidarArray);
        
        if (nearest) {
            // Update LiDAR properties
            if (nearest.bank_height_m) {
                feature.properties.lidar_avg_bank_height_m = nearest.bank_height_m;
            }
            
            if (nearest.veg_density !== undefined && nearest.veg_density !== null) {
                feature.properties.lidar_riparian_veg_density = nearest.veg_density;
            }
            
            if (nearest.bank_slope) {
                feature.properties.lidar_bank_slope = nearest.bank_slope;
            }
            
            if (nearest.roughness_coefficient) {
                feature.properties.manning_n = nearest.roughness_coefficient;
            }
            
            // Add metadata
            feature.properties.lidar_merged = true;
            feature.properties.lidar_source_id = nearest.segment_id;
        }
        
        return feature;
    });
    
    return {
        ...riverGeoJSON,
        features: mergedFeatures
    };
}

/**
 * Validate LiDAR data
 * @param {array} lidarArray - Array of LiDAR points
 * @returns {object} Validation result
 */
function validateLidarData(lidarArray) {
    const result = {
        isValid: true,
        errors: [],
        warnings: [],
        totalPoints: lidarArray.length
    };
    
    if (!Array.isArray(lidarArray) || lidarArray.length === 0) {
        result.isValid = false;
        result.errors.push('LiDAR array is empty or invalid');
        return result;
    }
    
    let validPoints = 0;
    
    lidarArray.forEach((point, idx) => {
        // Check required fields
        if (!point.latitude || !point.longitude) {
            result.errors.push(`Point ${idx}: Missing latitude or longitude`);
            return;
        }
        
        // Validate coordinate ranges
        if (point.latitude < -90 || point.latitude > 90) {
            result.errors.push(`Point ${idx}: Invalid latitude ${point.latitude}`);
            return;
        }
        
        if (point.longitude < -180 || point.longitude > 180) {
            result.errors.push(`Point ${idx}: Invalid longitude ${point.longitude}`);
            return;
        }
        
        // Check optional fields ranges
        if (point.bank_height_m !== undefined) {
            if (point.bank_height_m < 0 || point.bank_height_m > 50) {
                result.warnings.push(`Point ${idx}: Bank height ${point.bank_height_m}m seems unusual`);
            }
        }
        
        if (point.veg_density !== undefined) {
            if (point.veg_density < 0 || point.veg_density > 1) {
                result.errors.push(`Point ${idx}: Vegetation density must be 0-1`);
                return;
            }
        }
        
        validPoints++;
    });
    
    result.totalPoints = lidarArray.length;
    result.validPoints = validPoints;
    
    if (validPoints === 0) {
        result.isValid = false;
        result.errors.push('No valid LiDAR points found');
    }
    
    return result;
}

/**
 * Get LiDAR statistics
 * @param {array} lidarArray - Array of LiDAR points
 * @returns {object} Statistics object
 */
function getLidarStatistics(lidarArray) {
    if (!Array.isArray(lidarArray) || lidarArray.length === 0) {
        return null;
    }
    
    const stats = {
        totalPoints: lidarArray.length,
        avgBankHeight: 0,
        maxBankHeight: 0,
        minBankHeight: Infinity,
        avgVegDensity: 0
    };
    
    let bankHeightSum = 0;
    let vegDensitySum = 0;
    let bankHeightCount = 0;
    let vegDensityCount = 0;
    
    lidarArray.forEach(point => {
        if (point.bank_height_m !== undefined) {
            bankHeightSum += point.bank_height_m;
            bankHeightCount++;
            stats.maxBankHeight = Math.max(stats.maxBankHeight, point.bank_height_m);
            stats.minBankHeight = Math.min(stats.minBankHeight, point.bank_height_m);
        }
        
        if (point.veg_density !== undefined) {
            vegDensitySum += point.veg_density;
            vegDensityCount++;
        }
    });
    
    if (bankHeightCount > 0) {
        stats.avgBankHeight = parseFloat((bankHeightSum / bankHeightCount).toFixed(2));
    }
    
    if (vegDensityCount > 0) {
        stats.avgVegDensity = parseFloat((vegDensitySum / vegDensityCount).toFixed(2));
    }
    
    return stats;
}

export {
    calculateDistance,
    parseCSVText,
    processLidarCSV,
    processLidarGeoJSON,
    findNearestLidarPoint,
    getSegmentCenter,
    mergeLidarWithRiver,
    validateLidarData,
    getLidarStatistics
};
