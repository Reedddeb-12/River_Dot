/**
 * River Erosion Predictor - Main Application
 * Orchestrates the application logic and event handling
 */

// ========================================
// Application State
// ========================================

let appState = {
    currentGeoJSON: null,
    lidarData: null,
    analysisResults: null,
    lastDischarge: 300
};

// ========================================
// Initialization
// ========================================

document.addEventListener('DOMContentLoaded', initializeApp);

/**
 * Initialize the entire application
 */
async function initializeApp() {
    try {
        // 1. Initialize Map
        initializeMapView();
        
        // 2. Load default data
        appState.currentGeoJSON = DEFAULT_GEOJSON;
        updateRiverCount(DEFAULT_GEOJSON.features.length);
        
        // 3. Initialize UI
        initializeUIComponents();
        
        // 4. Setup event listeners
        setupEventListeners();
        
        // 5. Run initial analysis
        await performAnalysis();
        
        showSuccess('Application initialized successfully');
    } catch (error) {
        showError('Initialization failed: ' + error.message);
        console.error('App initialization error:', error);
    }
}

/**
 * Initialize map and layers
 */
function initializeMapView() {
    // Initialize map
    initializeMap(APP_CONFIG.defaultMapCenter, APP_CONFIG.defaultZoom);
    
    // Add tile layer
    addTileLayer(MAP_CONFIG.tileLayer, {
        attribution: MAP_CONFIG.attribution,
        subdomains: MAP_CONFIG.subdomains,
        maxZoom: MAP_CONFIG.maxZoom
    });
    
    // Load India boundary
    loadIndiaBoundary(MAP_CONFIG.indiaMapUrl, MAP_CONFIG.indiaStyle);
    
    // Add zoom controls
    addZoomControls('bottomright');
}

/**
 * Initialize UI components
 */
function initializeUIComponents() {
    initializeTabs();
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    const buttons = getButtons();
    
    // Analysis button
    if (buttons.runAnalysis) {
        buttons.runAnalysis.addEventListener('click', handleRunAnalysis);
    }
    
    // Merge LiDAR button
    if (buttons.mergeLidar) {
        buttons.mergeLidar.addEventListener('click', handleMergeLidar);
    }
    
    // Export button
    if (buttons.exportData) {
        buttons.exportData.addEventListener('click', handleExportData);
    }
    
    // Clear button
    if (buttons.clearData) {
        buttons.clearData.addEventListener('click', handleClearData);
    }
    
    // File upload handlers
    const geoJsonInput = document.getElementById('geojson-upload');
    if (geoJsonInput) {
        geoJsonInput.addEventListener('change', handleGeoJsonUpload);
    }
    
    const lidarCsvInput = document.getElementById('lidar-csv-upload');
    if (lidarCsvInput) {
        lidarCsvInput.addEventListener('change', handleLidarCsvUpload);
    }
    
    const lidarGeoJsonInput = document.getElementById('lidar-geojson-upload');
    if (lidarGeoJsonInput) {
        lidarGeoJsonInput.addEventListener('change', handleLidarGeoJsonUpload);
    }
    
    // Discharge input change
    const dischargeInput = document.getElementById('discharge-input');
    if (dischargeInput) {
        dischargeInput.addEventListener('change', (e) => {
            appState.lastDischarge = parseFloat(e.target.value);
        });
    }
}

// ========================================
// Event Handlers
// ========================================

/**
 * Handle run analysis button click
 */
async function handleRunAnalysis() {
    try {
        setButtonLoading('run-analysis-btn', true);
        await performAnalysis();
    } catch (error) {
        showError(error.message);
    } finally {
        setButtonLoading('run-analysis-btn', false);
    }
}

/**
 * Handle GeoJSON file upload
 */
async function handleGeoJsonUpload(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;
        
        const content = await readFileAsText(file);
        const data = JSON.parse(content);
        
        // Validate GeoJSON
        if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
            throw new Error('Invalid GeoJSON format');
        }
        
        appState.currentGeoJSON = data;
        updateRiverCount(data.features.length);
        
        showSuccess(`Loaded: ${file.name} (${data.features.length} segments)`);
        await performAnalysis();
    } catch (error) {
        showError('Failed to load GeoJSON: ' + error.message);
        event.target.value = '';
    }
}

/**
 * Handle LiDAR CSV upload
 */
async function handleLidarCsvUpload(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;
        
        const content = await readFileAsText(file);
        appState.lidarData = processLidarCSV(content);
        
        updateLidarStatus(
            `✓ LiDAR CSV loaded (${appState.lidarData.length} points)`,
            true
        );
        
        showSuccess(`Loaded LiDAR CSV: ${appState.lidarData.length} points`);
    } catch (error) {
        showError('Failed to load LiDAR CSV: ' + error.message);
        event.target.value = '';
        appState.lidarData = null;
    }
}

/**
 * Handle LiDAR GeoJSON upload
 */
async function handleLidarGeoJsonUpload(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;
        
        const content = await readFileAsText(file);
        const data = JSON.parse(content);
        
        appState.lidarData = processLidarGeoJSON(data);
        
        updateLidarStatus(
            `✓ LiDAR GeoJSON loaded (${appState.lidarData.length} features)`,
            true
        );
        
        showSuccess(`Loaded LiDAR GeoJSON: ${appState.lidarData.length} features`);
    } catch (error) {
        showError('Failed to load LiDAR GeoJSON: ' + error.message);
        event.target.value = '';
        appState.lidarData = null;
    }
}

/**
 * Handle merge LiDAR button click
 */
async function handleMergeLidar() {
    try {
        if (!appState.lidarData || appState.lidarData.length === 0) {
            showError('No LiDAR data loaded');
            return;
        }
        
        if (!appState.currentGeoJSON) {
            showError('No river data loaded');
            return;
        }
        
        setButtonLoading('merge-lidar-btn', true);
        
        // Validate LiDAR data
        const validation = validateLidarData(appState.lidarData);
        if (!validation.isValid) {
            throw new Error(validation.errors.join('; '));
        }
        
        // Merge datasets
        appState.currentGeoJSON = mergeLidarWithRiver(
            appState.currentGeoJSON,
            appState.lidarData
        );
        
        updateLidarStatus(
            `✓ Merged with ${appState.lidarData.length} LiDAR points`,
            true
        );
        
        showSuccess('LiDAR data merged successfully');
        
        // Re-run analysis with merged data
        await performAnalysis();
    } catch (error) {
        showError('Failed to merge LiDAR: ' + error.message);
    } finally {
        setButtonLoading('merge-lidar-btn', false);
    }
}

/**
 * Handle export data button click
 */
async function handleExportData() {
    try {
        if (!appState.analysisResults) {
            showError('No analysis results to export. Run analysis first.');
            return;
        }
        
        exportAsJSON(appState.analysisResults, 'river-analysis');
    } catch (error) {
        showError('Failed to export: ' + error.message);
    }
}

/**
 * Handle clear/reset button click
 */
async function handleClearData() {
    try {
        appState.currentGeoJSON = DEFAULT_GEOJSON;
        appState.lidarData = null;
        appState.analysisResults = null;
        
        clearFileInputs();
        updateLidarStatus('No LiDAR data loaded');
        updateRiverCount(DEFAULT_GEOJSON.features.length);
        setDischargeValue(APP_CONFIG.defaultDischarge);
        
        await performAnalysis();
        
        showSuccess('Reset to default data');
    } catch (error) {
        showError('Failed to reset: ' + error.message);
    }
}

// ========================================
// Analysis Functions
// ========================================

/**
 * Perform river analysis
 */
async function performAnalysis() {
    try {
        if (!appState.currentGeoJSON) {
            showError('No river data loaded');
            return;
        }
        
        const discharge = getDischargeValue();
        appState.lastDischarge = discharge;
        
        // Run analysis
        const results = calculateRiskProfile(
            discharge,
            appState.currentGeoJSON,
            HYDRODYNAMIC_PARAMS
        );
        
        appState.analysisResults = results;
        
        // Update map
        updateMapDisplay(results);
        
        // Update statistics
        const stats = getAnalysisStatistics(results);
        updateStatistics(stats);
        
        // Update console
        formatAndDisplayResults(results);
        
        showSuccess('Analysis complete');
    } catch (error) {
        showError('Analysis failed: ' + error.message);
        console.error('Analysis error:', error);
    }
}

/**
 * Format and display analysis results in console
 * @param {object} results - Analysis results
 */
function formatAndDisplayResults(results) {
    let output = '=== Analysis Results ===\n\n';
    
    results.features.forEach(feature => {
        const props = feature.properties;
        const calc = props.calculated;
        
        if (calc) {
            output += `Segment: ${props.name || 'Unnamed'}\n`;
            output += `  Risk: ${calc.riskCategory} (${calc.riskIndex})\n`;
            output += `  Shear: ${calc.shearStress} Pa | Velocity: ${calc.velocity} m/s\n\n`;
        }
    });
    
    updateConsole(output);
}

// ========================================
// Export Functions
// ========================================

// Make functions available globally for debugging
window.appState = appState;
window.performAnalysis = performAnalysis;
