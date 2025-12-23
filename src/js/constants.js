/**
 * River Erosion Predictor - Constants & Configuration
 * Global constants and configuration values
 */

// ========================================
// Application Configuration
// ========================================

const APP_CONFIG = {
    name: 'River Erosion & Sedimentation Hotspot Predictor',
    version: '1.0.0',
    defaultDischarge: 300,
    defaultMapCenter: [22, 82],
    defaultZoom: 4.5
};

// ========================================
// Hydrodynamic Parameters
// ========================================

const HYDRODYNAMIC_PARAMS = {
    waterDensity: 1000,           // kg/m³
    gravity: 9.81,                // m/s²
    vegetationEffect: 0.5,        // Vegetation resistance multiplier
    bankHeightFactor: 1.1,        // Bank stability sensitivity
    curvatureDefaultValue: 1.0
};

// ========================================
// Default Parameter Ranges
// ========================================

const PARAMETER_RANGES = {
    baseSlope: { min: 0.00001, max: 0.1, default: 0.0005 },
    manningN: { min: 0.02, max: 0.10, default: 0.035 },
    criticalShear: { min: 0.5, max: 10, default: 2.5 },
    channelWidth: { min: 5, max: 5000, default: 200 },
    curvature: { min: 1.0, max: 2.5, default: 1.0 },
    bankHeight: { min: 0, max: 50, default: 10.0 },
    vegDensity: { min: 0, max: 1.0, default: 0.5 }
};

// ========================================
// Risk Categories & Colors
// ========================================

const RISK_CATEGORIES = {
    HIGH_EROSION: {
        name: 'High Erosion',
        color: '#ef4444',
        weight: 7,
        minIndex: 1.5,
        maxIndex: Infinity
    },
    MED_EROSION: {
        name: 'Medium Erosion',
        color: '#f97316',
        weight: 6,
        minIndex: 1.1,
        maxIndex: 1.5
    },
    STABLE: {
        name: 'Stable',
        color: '#22c55e',
        weight: 4,
        minIndex: 0.9,
        maxIndex: 1.1
    },
    MED_DEPOSITION: {
        name: 'Medium Deposition',
        color: '#3b82f6',
        weight: 6,
        minIndex: 0.6,
        maxIndex: 0.9
    },
    HIGH_DEPOSITION: {
        name: 'High Deposition',
        color: '#6366f1',
        weight: 7,
        minIndex: 0,
        maxIndex: 0.6
    }
};

// ========================================
// Map Configuration
// ========================================

const MAP_CONFIG = {
    tileLayer: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap, CARTO',
    subdomains: 'abcd',
    maxZoom: 20,
    indiaMapUrl: 'https://gist.githubusercontent.com/jammastergirish/476c3463ac3752e030098935209831b0/raw/0aa5f0f37807c9a2046429227187c805afdc34a9/India_State_And_UT.json',
    indiaStyle: {
        color: '#4b5563',
        weight: 1,
        fillColor: '#1f2937',
        fillOpacity: 0.5
    }
};

// ========================================
// Default Ganga River Data
// ========================================

const DEFAULT_GEOJSON = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            properties: {
                id: 1,
                name: 'Ganga: Rishikesh-Haridwar',
                base_slope: 0.0025,
                curvature: 1.2,
                manning_n: 0.050,
                critical_shear: 4.5,
                channel_width: 150,
                lidar_avg_bank_height_m: 8.0,
                lidar_riparian_veg_density: 0.8
            },
            geometry: {
                type: 'LineString',
                coordinates: [[78.29, 30.10], [78.16, 29.94]]
            }
        },
        {
            type: 'Feature',
            properties: {
                id: 2,
                name: 'Ganga: Kanpur-Prayagraj',
                base_slope: 0.0001,
                curvature: 1.8,
                manning_n: 0.030,
                critical_shear: 2.0,
                channel_width: 600,
                lidar_avg_bank_height_m: 15.0,
                lidar_riparian_veg_density: 0.3
            },
            geometry: {
                type: 'LineString',
                coordinates: [[80.33, 26.45], [80.90, 26.10], [81.84, 25.43]]
            }
        },
        {
            type: 'Feature',
            properties: {
                id: 3,
                name: 'Ganga: Varanasi Reach',
                base_slope: 0.00008,
                curvature: 1.5,
                manning_n: 0.028,
                critical_shear: 1.8,
                channel_width: 700,
                lidar_avg_bank_height_m: 12.0,
                lidar_riparian_veg_density: 0.2
            },
            geometry: {
                type: 'LineString',
                coordinates: [[82.95, 25.33], [83.01, 25.28], [83.05, 25.32]]
            }
        },
        {
            type: 'Feature',
            properties: {
                id: 4,
                name: 'Ganga: Downstream of Farakka',
                base_slope: 0.00005,
                curvature: 1.1,
                manning_n: 0.025,
                critical_shear: 1.5,
                channel_width: 1200,
                lidar_avg_bank_height_m: 5.0,
                lidar_riparian_veg_density: 0.6
            },
            geometry: {
                type: 'LineString',
                coordinates: [[87.92, 24.81], [88.10, 24.60], [88.35, 24.40]]
            }
        }
    ]
};

// ========================================
// UI Configuration
// ========================================

const UI_CONFIG = {
    consoleHeight: '8rem',
    panelMaxWidth: 'md',
    animationDuration: 200,
    tabs: [
        { id: 'analysis', label: 'Analysis', icon: 'ph-chart-bar-horizontal' },
        { id: 'lidar', label: 'LiDAR', icon: 'ph-satellite' },
        { id: 'data', label: 'Data', icon: 'ph-database' }
    ]
};

// ========================================
// Validation Rules
// ========================================

const VALIDATION = {
    coordinates: {
        latMin: -90,
        latMax: 90,
        lonMin: -180,
        lonMax: 180
    },
    discharge: {
        min: 10,
        max: 5000,
        step: 10
    },
    segmentIdRegex: /^[a-zA-Z0-9_-]+$/,
    dateRegex: /^\d{4}-\d{2}-\d{2}$/
};

// ========================================
// Error Messages
// ========================================

const ERROR_MESSAGES = {
    invalidGeoJSON: 'Invalid GeoJSON format. Ensure it\'s a valid FeatureCollection.',
    invalidCSV: 'Invalid CSV format. Check required columns.',
    invalidCoordinates: 'Invalid coordinates. Must be WGS84 (±180 lon, ±90 lat).',
    noData: 'No data loaded. Please upload a GeoJSON file first.',
    mergeError: 'Error merging LiDAR data.',
    analysisError: 'Error running analysis.',
    fileReadError: 'Error reading file.'
};

// ========================================
// Success Messages
// ========================================

const SUCCESS_MESSAGES = {
    dataLoaded: 'Data loaded successfully.',
    lidarMerged: 'LiDAR data merged successfully.',
    analysisComplete: 'Analysis complete.',
    exported: 'Results exported successfully.'
};

// ========================================
// Data Export Configuration
// ========================================

const EXPORT_CONFIG = {
    format: 'geojson',
    dateFormat: 'YYYY-MM-DD',
    precision: 2
};

export {
    APP_CONFIG,
    HYDRODYNAMIC_PARAMS,
    PARAMETER_RANGES,
    RISK_CATEGORIES,
    MAP_CONFIG,
    DEFAULT_GEOJSON,
    UI_CONFIG,
    VALIDATION,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    EXPORT_CONFIG
};
