/**
 * Map Manager Module
 * Handles map initialization, updates, and layer management
 */

let map = null;
let riverLayer = null;

/**
 * Initialize Leaflet map
 * @param {array} center - Map center [lat, lon]
 * @param {number} zoom - Initial zoom level
 * @returns {object} Leaflet map instance
 */
function initializeMap(center, zoom) {
    map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    }).setView(center, zoom);
    
    return map;
}

/**
 * Add base tile layer to map
 * @param {string} tileUrl - Tile layer URL
 * @param {object} options - Tile layer options
 */
function addTileLayer(tileUrl, options = {}) {
    L.tileLayer(tileUrl, {
        attribution: options.attribution || '&copy; OpenStreetMap contributors',
        subdomains: options.subdomains || 'abc',
        maxZoom: options.maxZoom || 19,
        ...options
    }).addTo(map);
}

/**
 * Load and display India boundary overlay
 * @param {string} mapDataUrl - URL to India GeoJSON
 * @param {object} style - Style options
 */
function loadIndiaBoundary(mapDataUrl, style = {}) {
    fetch(mapDataUrl)
        .then(response => response.json())
        .then(geoJSON => {
            L.geoJSON(geoJSON, {
                style: {
                    color: style.color || '#4b5563',
                    weight: style.weight || 1,
                    fillColor: style.fillColor || '#1f2937',
                    fillOpacity: style.fillOpacity || 0.5,
                    ...style
                }
            }).addTo(map);
        })
        .catch(error => {
            console.warn('Could not load India boundary:', error);
        });
}

/**
 * Add zoom controls to map
 * @param {string} position - Position: 'topright', 'topleft', 'bottomright', 'bottomleft'
 */
function addZoomControls(position = 'bottomright') {
    L.control.zoom({ position: position }).addTo(map);
}

/**
 * Remove existing river layer
 */
function removeRiverLayer() {
    if (riverLayer) {
        map.removeLayer(riverLayer);
        riverLayer = null;
    }
}

/**
 * Get color and weight based on risk index
 * @param {number} riskIndex - Risk index value
 * @returns {object} Style properties {color, weight}
 */
function getStyleByRiskIndex(riskIndex) {
    if (riskIndex > 1.5) {
        return { color: '#ef4444', weight: 7 };
    } else if (riskIndex > 1.1) {
        return { color: '#f97316', weight: 6 };
    } else if (riskIndex < 0.6) {
        return { color: '#6366f1', weight: 7 };
    } else if (riskIndex < 0.9) {
        return { color: '#3b82f6', weight: 6 };
    }
    return { color: '#22c55e', weight: 4 };
}

/**
 * Create popup content for a river segment
 * @param {object} feature - GeoJSON feature
 * @returns {string} HTML popup content
 */
function createPopupContent(feature) {
    const props = feature.properties;
    const calc = props.calculated;
    
    if (!calc) {
        return `<div class="text-sm"><h4>${props.name || 'Unnamed Segment'}</h4><p>No analysis data</p></div>`;
    }
    
    return `
        <div class="space-y-2 text-sm text-white">
            <h4 class="font-bold text-lg text-blue-300">${props.name || 'Segment ' + props.id}</h4>
            <p><strong class="text-gray-400">Risk Category:</strong> ${calc.riskCategory}</p>
            <p><strong class="text-gray-400">Risk Index:</strong> ${calc.riskIndex}</p>
            <hr class="border-white/10 my-2">
            <p><strong class="text-gray-400">Shear Stress:</strong> ${calc.shearStress} Pa</p>
            <p><strong class="text-gray-400">Velocity:</strong> ${calc.velocity} m/s</p>
            <p><strong class="text-gray-400">Depth:</strong> ${calc.flowDepth} m</p>
            <hr class="border-white/10 my-2">
            <p class="text-green-400"><i class="ph-ruler"></i> <strong class="text-gray-400">Bank Height (LiDAR):</strong> ${calc.bankHeight} m</p>
            <p class="text-green-400"><i class="ph-tree"></i> <strong class="text-gray-400">Veg. Density (LiDAR):</strong> ${calc.vegDensity}</p>
        </div>
    `;
}

/**
 * Add river data to map with styling
 * @param {object} riskedData - GeoJSON with calculated properties
 */
function addRiverLayer(riskedData) {
    removeRiverLayer();
    
    if (!riskedData || !riskedData.features) {
        console.error('Invalid data for river layer');
        return;
    }
    
    riverLayer = L.geoJSON(riskedData, {
        style: (feature) => {
            const riskIndex = feature.properties.calculated?.riskIndex || 1.0;
            return getStyleByRiskIndex(riskIndex);
        },
        onEachFeature: (feature, layer) => {
            const content = createPopupContent(feature);
            layer.bindPopup(content, { className: 'custom-popup' });
        }
    }).addTo(map);
    
    return riverLayer;
}

/**
 * Fit map bounds to river layer
 * @param {number} padding - Padding factor (0-1)
 */
function fitMapToRiverLayer(padding = 0.1) {
    if (riverLayer) {
        try {
            map.fitBounds(riverLayer.getBounds().pad(padding));
        } catch (error) {
            console.warn('Could not fit bounds:', error);
        }
    }
}

/**
 * Update map display with new analysis data
 * @param {object} geojsonData - GeoJSON with calculated properties
 * @param {boolean} fitBounds - Whether to adjust map view
 */
function updateMapDisplay(geojsonData, fitBounds = false) {
    addRiverLayer(geojsonData);
    
    if (fitBounds) {
        fitMapToRiverLayer(0.1);
    }
}

/**
 * Get map instance
 * @returns {object} Leaflet map object
 */
function getMap() {
    return map;
}

/**
 * Check if map is initialized
 * @returns {boolean} True if map exists
 */
function isMapInitialized() {
    return map !== null;
}

/**
 * Get current river layer
 * @returns {object} Current river layer
 */
function getRiverLayer() {
    return riverLayer;
}

export {
    initializeMap,
    addTileLayer,
    loadIndiaBoundary,
    addZoomControls,
    removeRiverLayer,
    getStyleByRiskIndex,
    createPopupContent,
    addRiverLayer,
    fitMapToRiverLayer,
    updateMapDisplay,
    getMap,
    isMapInitialized,
    getRiverLayer
};
