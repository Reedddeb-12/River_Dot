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
    lastDischarge: 300,
    map: null,
    riverLayer: null
};

// ========================================
// Initialization
// ========================================

document.addEventListener('DOMContentLoaded', initializeApp);

/**
 * Initialize the entire application
 */
function initializeApp() {
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
        performAnalysis();
        
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
    try {
        // Initialize map
        appState.map = L.map('map', {
            zoomControl: false,
            attributionControl: false
        }).setView([22, 82], 4.5);
        
        // Add tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap, CARTO',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(appState.map);
        
        // Load India boundary
        fetch('https://gist.githubusercontent.com/jammastergirish/476c3463ac3752e030098935209831b0/raw/0aa5f0f37807c9a2046429227187c805afdc34a9/India_State_And_UT.json')
            .then(response => response.json())
            .then(indiaGeoJSON => {
                L.geoJSON(indiaGeoJSON, {
                    style: {
                        color: '#4b5563',
                        weight: 1,
                        fillColor: '#1f2937',
                        fillOpacity: 0.5
                    }
                }).addTo(appState.map);
            })
            .catch(error => console.warn('Could not load India boundary:', error));
        
        // Add zoom controls
        L.control.zoom({ position: 'bottomright' }).addTo(appState.map);
        
        console.log('Map initialized successfully');
    } catch (error) {
        console.error('Map initialization error:', error);
        throw error;
    }
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
function performAnalysis() {
    try {
        if (!appState.currentGeoJSON) {
            showError('No river data loaded');
            return;
        }
        
        const discharge = getDischargeValue();
        appState.lastDischarge = discharge;
        
        console.log('Starting analysis with discharge:', discharge);
        
        // Run analysis
        const results = calculateRiskProfile(
            discharge,
            appState.currentGeoJSON,
            HYDRODYNAMIC_PARAMS
        );
        
        console.log('Analysis results:', results);
        
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
 * Update map display with new analysis data
 */
function updateMapDisplay(geojsonData) {
    try {
        // Remove existing river layer
        if (appState.riverLayer) {
            appState.map.removeLayer(appState.riverLayer);
            appState.riverLayer = null;
        }
        
        if (!geojsonData || !geojsonData.features) {
            console.error('Invalid data for river layer');
            return;
        }
        
        appState.riverLayer = L.geoJSON(geojsonData, {
            style: (feature) => {
                const riskIndex = feature.properties.calculated?.riskIndex || 1.0;
                if (riskIndex > 1.5) {
                    return { color: '#ef4444', weight: 7, opacity: 0.9 };
                } else if (riskIndex > 1.1) {
                    return { color: '#f97316', weight: 6, opacity: 0.9 };
                } else if (riskIndex < 0.6) {
                    return { color: '#6366f1', weight: 7, opacity: 0.9 };
                } else if (riskIndex < 0.9) {
                    return { color: '#3b82f6', weight: 6, opacity: 0.9 };
                }
                return { color: '#22c55e', weight: 4, opacity: 0.9 };
            },
            onEachFeature: (feature, layer) => {
                const props = feature.properties;
                const calc = props.calculated;
                
                if (calc) {
                    const content = `
                        <div class="space-y-2 text-sm text-white">
                            <h4 class="font-bold text-lg text-blue-300">${props.name || 'Segment ' + props.id}</h4>
                            <p><strong class="text-gray-400">Risk:</strong> ${calc.riskCategory}</p>
                            <p><strong class="text-gray-400">Index:</strong> ${calc.riskIndex}</p>
                            <hr class="border-white/10 my-2">
                            <p><strong class="text-gray-400">Shear:</strong> ${calc.shearStress} Pa</p>
                            <p><strong class="text-gray-400">Velocity:</strong> ${calc.velocity} m/s</p>
                            <p><strong class="text-gray-400">Depth:</strong> ${calc.flowDepth} m</p>
                        </div>
                    `;
                    layer.bindPopup(content, { className: 'custom-popup' });
                }
            }
        }).addTo(appState.map);
    } catch (error) {
        console.error('Map update error:', error);
    }
}

/**
 * Format and display analysis results in console
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
// Global Access
// ========================================

// Make functions available globally for debugging
window.appState = appState;
window.performAnalysis = performAnalysis;
console.log('App loaded successfully');
