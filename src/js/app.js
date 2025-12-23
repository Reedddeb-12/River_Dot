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

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    initializeApp();
});

/**
 * Initialize the entire application
 */
function initializeApp() {
    try {
        console.log('Starting app initialization...');
        
        // 1. Initialize Map
        initializeMapView();
        
        // 2. Load default data
        appState.currentGeoJSON = JSON.parse(JSON.stringify(DEFAULT_GEOJSON));
        updateRiverCount(appState.currentGeoJSON.features.length);
        console.log('Default data loaded:', appState.currentGeoJSON.features.length, 'segments');
        
        // 3. Initialize UI
        initializeUIComponents();
        
        // 4. Setup event listeners
        setupEventListeners();
        
        // 5. Run initial analysis
        performAnalysis();
        
        showSuccess('Application initialized successfully');
        console.log('App initialization complete');
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
        console.log('Initializing map...');
        
        // Initialize map
        appState.map = L.map('map', {
            zoomControl: false,
            attributionControl: false
        }).setView([22, 82], 4.5);
        
        console.log('Map created');
        
        // Add tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap, CARTO',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(appState.map);
        
        console.log('Tile layer added');
        
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
                console.log('India boundary loaded');
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
    console.log('Initializing UI components...');
    initializeTabs();
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    const buttons = getButtons();
    
    // Analysis button
    if (buttons.runAnalysis) {
        buttons.runAnalysis.addEventListener('click', function() {
            console.log('Run Analysis clicked');
            handleRunAnalysis();
        });
        console.log('Run Analysis button listener added');
    }
    
    // Merge LiDAR button
    if (buttons.mergeLidar) {
        buttons.mergeLidar.addEventListener('click', function() {
            console.log('Merge LiDAR clicked');
            handleMergeLidar();
        });
        console.log('Merge LiDAR button listener added');
    }
    
    // Export button
    if (buttons.exportData) {
        buttons.exportData.addEventListener('click', function() {
            console.log('Export clicked');
            handleExportData();
        });
        console.log('Export button listener added');
    }
    
    // Clear button
    if (buttons.clearData) {
        buttons.clearData.addEventListener('click', function() {
            console.log('Clear clicked');
            handleClearData();
        });
        console.log('Clear button listener added');
    }
    
    // File upload handlers
    const geoJsonInput = document.getElementById('geojson-upload');
    if (geoJsonInput) {
        geoJsonInput.addEventListener('change', function(e) {
            console.log('GeoJSON file selected');
            handleGeoJsonUpload(e);
        });
        console.log('GeoJSON upload listener added');
    }
    
    const lidarCsvInput = document.getElementById('lidar-csv-upload');
    if (lidarCsvInput) {
        lidarCsvInput.addEventListener('change', function(e) {
            console.log('LiDAR CSV file selected');
            handleLidarCsvUpload(e);
        });
        console.log('LiDAR CSV upload listener added');
    }
    
    const lidarGeoJsonInput = document.getElementById('lidar-geojson-upload');
    if (lidarGeoJsonInput) {
        lidarGeoJsonInput.addEventListener('change', function(e) {
            console.log('LiDAR GeoJSON file selected');
            handleLidarGeoJsonUpload(e);
        });
        console.log('LiDAR GeoJSON upload listener added');
    }
    
    // Discharge input change
    const dischargeInput = document.getElementById('discharge-input');
    if (dischargeInput) {
        dischargeInput.addEventListener('change', function(e) {
            appState.lastDischarge = parseFloat(e.target.value);
            console.log('Discharge changed to:', appState.lastDischarge);
        });
        console.log('Discharge input listener added');
    }
}

// ========================================
// Event Handlers
// ========================================

/**
 * Handle run analysis button click
 */
function handleRunAnalysis() {
    try {
        console.log('Starting analysis...');
        performAnalysis();
    } catch (error) {
        showError('Analysis failed: ' + error.message);
        console.error('Analysis error:', error);
    }
}

/**
 * Handle GeoJSON file upload
 */
function handleGeoJsonUpload(event) {
    try {
        const file = event.target.files[0];
        console.log('File selected:', file ? file.name : 'none');
        
        if (!file) {
            console.log('No file selected');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                console.log('File loaded, parsing JSON...');
                const content = e.target.result;
                const data = JSON.parse(content);
                
                console.log('Parsed data:', data);
                
                // Validate GeoJSON
                if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
                    throw new Error('Invalid GeoJSON format. Must be FeatureCollection');
                }
                
                console.log('GeoJSON validated, features:', data.features.length);
                
                appState.currentGeoJSON = data;
                updateRiverCount(data.features.length);
                
                showSuccess(`Loaded: ${file.name} (${data.features.length} segments)`);
                
                console.log('Running analysis with loaded data...');
                performAnalysis();
            } catch (error) {
                console.error('Error processing file:', error);
                showError('Failed to load GeoJSON: ' + error.message);
                event.target.value = '';
            }
        };
        
        reader.onerror = function() {
            console.error('FileReader error');
            showError('Error reading file');
            event.target.value = '';
        };
        
        reader.readAsText(file);
    } catch (error) {
        console.error('Error in handleGeoJsonUpload:', error);
        showError('Failed to load GeoJSON: ' + error.message);
        event.target.value = '';
    }
}

/**
 * Handle LiDAR CSV upload
 */
function handleLidarCsvUpload(event) {
    try {
        const file = event.target.files[0];
        console.log('LiDAR CSV file selected:', file ? file.name : 'none');
        
        if (!file) {
            console.log('No file selected');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                console.log('CSV file loaded, processing...');
                const content = e.target.result;
                appState.lidarData = processLidarCSV(content);
                
                console.log('LiDAR data processed:', appState.lidarData.length, 'points');
                
                updateLidarStatus(
                    `✓ LiDAR CSV loaded (${appState.lidarData.length} points)`,
                    true
                );
                
                showSuccess(`Loaded LiDAR CSV: ${appState.lidarData.length} points`);
            } catch (error) {
                console.error('Error processing CSV:', error);
                showError('Failed to load LiDAR CSV: ' + error.message);
                event.target.value = '';
                appState.lidarData = null;
            }
        };
        
        reader.onerror = function() {
            console.error('FileReader error');
            showError('Error reading file');
            event.target.value = '';
        };
        
        reader.readAsText(file);
    } catch (error) {
        console.error('Error in handleLidarCsvUpload:', error);
        showError('Failed to load LiDAR CSV: ' + error.message);
        event.target.value = '';
        appState.lidarData = null;
    }
}

/**
 * Handle LiDAR GeoJSON upload
 */
function handleLidarGeoJsonUpload(event) {
    try {
        const file = event.target.files[0];
        console.log('LiDAR GeoJSON file selected:', file ? file.name : 'none');
        
        if (!file) {
            console.log('No file selected');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                console.log('GeoJSON file loaded, parsing...');
                const content = e.target.result;
                const data = JSON.parse(content);
                
                console.log('Parsed GeoJSON');
                
                appState.lidarData = processLidarGeoJSON(data);
                
                console.log('LiDAR GeoJSON processed:', appState.lidarData.length, 'features');
                
                updateLidarStatus(
                    `✓ LiDAR GeoJSON loaded (${appState.lidarData.length} features)`,
                    true
                );
                
                showSuccess(`Loaded LiDAR GeoJSON: ${appState.lidarData.length} features`);
            } catch (error) {
                console.error('Error processing GeoJSON:', error);
                showError('Failed to load LiDAR GeoJSON: ' + error.message);
                event.target.value = '';
                appState.lidarData = null;
            }
        };
        
        reader.onerror = function() {
            console.error('FileReader error');
            showError('Error reading file');
            event.target.value = '';
        };
        
        reader.readAsText(file);
    } catch (error) {
        console.error('Error in handleLidarGeoJsonUpload:', error);
        showError('Failed to load LiDAR GeoJSON: ' + error.message);
        event.target.value = '';
        appState.lidarData = null;
    }
}

/**
 * Handle merge LiDAR button click
 */
function handleMergeLidar() {
    try {
        console.log('Merge LiDAR started');
        
        if (!appState.lidarData || appState.lidarData.length === 0) {
            showError('No LiDAR data loaded');
            return;
        }
        
        if (!appState.currentGeoJSON) {
            showError('No river data loaded');
            return;
        }
        
        console.log('Validating LiDAR data...');
        
        // Validate LiDAR data
        const validation = validateLidarData(appState.lidarData);
        if (!validation.isValid) {
            throw new Error(validation.errors.join('; '));
        }
        
        console.log('LiDAR data valid');
        
        // Merge datasets
        console.log('Merging LiDAR with river data...');
        appState.currentGeoJSON = mergeLidarWithRiver(
            appState.currentGeoJSON,
            appState.lidarData
        );
        
        console.log('Merge complete');
        
        updateLidarStatus(
            `✓ Merged with ${appState.lidarData.length} LiDAR points`,
            true
        );
        
        showSuccess('LiDAR data merged successfully');
        
        // Re-run analysis with merged data
        console.log('Running analysis with merged data...');
        performAnalysis();
    } catch (error) {
        console.error('Error merging LiDAR:', error);
        showError('Failed to merge LiDAR: ' + error.message);
    }
}

/**
 * Handle export data button click
 */
function handleExportData() {
    try {
        console.log('Export requested');
        
        if (!appState.analysisResults) {
            showError('No analysis results to export. Run analysis first.');
            return;
        }
        
        exportAsJSON(appState.analysisResults, 'river-analysis');
    } catch (error) {
        showError('Failed to export: ' + error.message);
        console.error('Export error:', error);
    }
}

/**
 * Handle clear/reset button click
 */
function handleClearData() {
    try {
        console.log('Clearing data...');
        
        appState.currentGeoJSON = JSON.parse(JSON.stringify(DEFAULT_GEOJSON));
        appState.lidarData = null;
        appState.analysisResults = null;
        
        clearFileInputs();
        updateLidarStatus('No LiDAR data loaded');
        updateRiverCount(DEFAULT_GEOJSON.features.length);
        setDischargeValue(APP_CONFIG.defaultDischarge);
        
        console.log('Data cleared, running analysis...');
        performAnalysis();
        
        showSuccess('Reset to default data');
    } catch (error) {
        showError('Failed to reset: ' + error.message);
        console.error('Clear error:', error);
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
        console.log('=== Starting Analysis ===');
        
        if (!appState.currentGeoJSON) {
            showError('No river data loaded');
            return;
        }
        
        const discharge = getDischargeValue();
        appState.lastDischarge = discharge;
        
        console.log('Discharge:', discharge);
        console.log('Features to analyze:', appState.currentGeoJSON.features.length);
        
        // Run analysis
        const results = calculateRiskProfile(
            discharge,
            appState.currentGeoJSON,
            HYDRODYNAMIC_PARAMS
        );
        
        console.log('Analysis complete, results:', results);
        
        appState.analysisResults = results;
        
        // Update map
        console.log('Updating map display...');
        updateMapDisplay(results);
        
        // Update statistics
        const stats = getAnalysisStatistics(results);
        console.log('Statistics:', stats);
        updateStatistics(stats);
        
        // Update console
        formatAndDisplayResults(results);
        
        showSuccess('Analysis complete');
        console.log('=== Analysis Finished ===');
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
        console.log('Updating map display...');
        
        // Remove existing river layer
        if (appState.riverLayer) {
            appState.map.removeLayer(appState.riverLayer);
            appState.riverLayer = null;
            console.log('Removed old river layer');
        }
        
        if (!geojsonData || !geojsonData.features) {
            console.error('Invalid data for river layer');
            return;
        }
        
        console.log('Adding', geojsonData.features.length, 'features to map');
        
        appState.riverLayer = L.geoJSON(geojsonData, {
            style: function(feature) {
                const riskIndex = feature.properties.calculated?.riskIndex || 1.0;
                let style = { opacity: 0.9 };
                
                if (riskIndex > 1.5) {
                    style.color = '#ef4444';
                    style.weight = 7;
                } else if (riskIndex > 1.1) {
                    style.color = '#f97316';
                    style.weight = 6;
                } else if (riskIndex < 0.6) {
                    style.color = '#6366f1';
                    style.weight = 7;
                } else if (riskIndex < 0.9) {
                    style.color = '#3b82f6';
                    style.weight = 6;
                } else {
                    style.color = '#22c55e';
                    style.weight = 4;
                }
                
                return style;
            },
            onEachFeature: function(feature, layer) {
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
        
        console.log('Map display updated');
    } catch (error) {
        console.error('Map update error:', error);
    }
}

/**
 * Format and display analysis results in console
 */
function formatAndDisplayResults(results) {
    let output = '=== Analysis Results ===\n';
    output += `Total Segments: ${results.features.length}\n`;
    output += `Discharge: ${appState.lastDischarge} m³/s\n`;
    output += '─────────────────────\n\n';
    
    results.features.forEach((feature, index) => {
        const props = feature.properties;
        const calc = props.calculated;
        
        if (calc) {
            output += `${index + 1}. ${props.name || 'Segment ' + props.id}\n`;
            output += `   Risk: ${calc.riskCategory} (${calc.riskIndex})\n`;
            output += `   Shear: ${calc.shearStress} Pa\n`;
            output += `   Velocity: ${calc.velocity} m/s\n`;
            output += `   Depth: ${calc.flowDepth} m\n\n`;
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
window.getAnalysisStatistics = getAnalysisStatistics;

console.log('App script loaded successfully');
