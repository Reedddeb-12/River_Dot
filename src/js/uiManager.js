/**
 * UI Manager Module
 * Handles UI interactions, tab management, and user feedback
 */

/**
 * Initialize tab navigation
 * @param {function} onTabChange - Callback when tab changes
 */
function initializeTabs(onTabChange = null) {
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            switchTab(tabName);
            
            if (onTabChange) {
                onTabChange(tabName);
            }
        });
    });
}

/**
 * Switch to a specific tab
 * @param {string} tabName - Tab identifier
 */
function switchTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.add('hidden');
    });
    
    // Remove active class from all buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.classList.remove('active');
        button.classList.add('inactive');
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) {
        selectedTab.classList.remove('hidden');
    }
    
    // Activate selected button
    const selectedButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (selectedButton) {
        selectedButton.classList.add('active');
        selectedButton.classList.remove('inactive');
    }
}

/**
 * Update console output
 * @param {string} message - Message to display
 * @param {boolean} append - Whether to append or replace
 */
function updateConsole(message, append = false) {
    const console = document.getElementById('output-console');
    if (console) {
        if (append) {
            console.textContent += '\n' + message;
        } else {
            console.textContent = message;
        }
        // Auto-scroll to bottom
        console.scrollTop = console.scrollHeight;
    }
}

/**
 * Clear console
 */
function clearConsole() {
    const console = document.getElementById('output-console');
    if (console) {
        console.textContent = '';
    }
}

/**
 * Log message to console
 * @param {string} message - Message to log
 */
function logMessage(message) {
    updateConsole(message, true);
}

/**
 * Update LiDAR status display
 * @param {string} status - Status message
 * @param {boolean} isSuccess - Whether status is positive
 */
function updateLidarStatus(status, isSuccess = false) {
    const statusEl = document.getElementById('lidar-status');
    if (statusEl) {
        statusEl.textContent = status;
        if (isSuccess) {
            statusEl.style.color = '#22c55e';
        } else {
            statusEl.style.color = '#9ca3af';
        }
    }
}

/**
 * Update data statistics display
 * @param {object} stats - Statistics object
 */
function updateStatistics(stats) {
    if (!stats) return;
    
    const elements = {
        'stat-segments': stats.totalSegments,
        'stat-high-erosion': stats.highErosion,
        'stat-med-erosion': stats.mediumErosion,
        'stat-stable': stats.stable,
        'stat-deposition': stats.highDeposition
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value;
        }
    });
}

/**
 * Get discharge input value
 * @returns {number} Discharge in m³/s
 */
function getDischargeValue() {
    const input = document.getElementById('discharge-input');
    return input ? parseFloat(input.value) : 300;
}

/**
 * Set discharge input value
 * @param {number} value - Discharge value
 */
function setDischargeValue(value) {
    const input = document.getElementById('discharge-input');
    if (input) {
        input.value = value;
    }
}

/**
 * Get GeoJSON file input
 * @returns {File} Selected file or null
 */
function getGeoJsonFile() {
    const input = document.getElementById('geojson-upload');
    return input?.files[0] || null;
}

/**
 * Get LiDAR CSV file input
 * @returns {File} Selected file or null
 */
function getLidarCsvFile() {
    const input = document.getElementById('lidar-csv-upload');
    return input?.files[0] || null;
}

/**
 * Get LiDAR GeoJSON file input
 * @returns {File} Selected file or null
 */
function getLidarGeoJsonFile() {
    const input = document.getElementById('lidar-geojson-upload');
    return input?.files[0] || null;
}

/**
 * Clear file inputs
 */
function clearFileInputs() {
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs.forEach(input => {
        input.value = '';
    });
}

/**
 * Get button elements
 * @returns {object} Button element references
 */
function getButtons() {
    return {
        runAnalysis: document.getElementById('run-analysis-btn'),
        mergeLidar: document.getElementById('merge-lidar-btn'),
        exportData: document.getElementById('export-data-btn'),
        clearData: document.getElementById('clear-data-btn')
    };
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
    updateConsole(`✗ Error: ${message}`);
    console.error(message);
}

/**
 * Show success message
 * @param {string} message - Success message
 */
function showSuccess(message) {
    updateConsole(`✓ ${message}`);
    console.log(message);
}

/**
 * Update river count in data tab
 * @param {number} count - Number of river segments
 */
function updateRiverCount(count) {
    const el = document.getElementById('river-count');
    if (el) {
        el.textContent = count;
    }
}

/**
 * Export data as JSON file
 * @param {object} data - Data to export
 * @param {string} filename - Filename (without extension)
 */
function exportAsJSON(data, filename = 'river-analysis') {
    try {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showSuccess('Results exported successfully');
    } catch (error) {
        showError('Failed to export results: ' + error.message);
    }
}

/**
 * Read file as text
 * @param {File} file - File to read
 * @returns {Promise<string>} File content
 */
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('File read error'));
        reader.readAsText(file);
    });
}

/**
 * Enable/disable button
 * @param {string} buttonId - Button element ID
 * @param {boolean} enabled - Whether to enable
 */
function setButtonEnabled(buttonId, enabled = true) {
    const btn = document.getElementById(buttonId);
    if (btn) {
        btn.disabled = !enabled;
        if (enabled) {
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        } else {
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        }
    }
}

/**
 * Show loading spinner on button
 * @param {string} buttonId - Button element ID
 * @param {boolean} show - Whether to show
 */
function setButtonLoading(buttonId, show = true) {
    const btn = document.getElementById(buttonId);
    if (btn) {
        if (show) {
            btn.disabled = true;
            btn.innerHTML = '<i class="ph-spinner ph-spin ph-lg"></i> Processing...';
        } else {
            btn.disabled = false;
            // Restore original content
            if (buttonId === 'run-analysis-btn') {
                btn.innerHTML = '<i class="ph-play-circle ph-lg"></i> Run Analysis';
            } else if (buttonId === 'merge-lidar-btn') {
                btn.innerHTML = '<i class="ph-plus"></i> Merge LiDAR Data';
            }
        }
    }
}

export {
    initializeTabs,
    switchTab,
    updateConsole,
    clearConsole,
    logMessage,
    updateLidarStatus,
    updateStatistics,
    getDischargeValue,
    setDischargeValue,
    getGeoJsonFile,
    getLidarCsvFile,
    getLidarGeoJsonFile,
    clearFileInputs,
    getButtons,
    showError,
    showSuccess,
    updateRiverCount,
    exportAsJSON,
    readFileAsText,
    setButtonEnabled,
    setButtonLoading
};
