/**
 * UI Manager Module
 * Handles UI interactions, tab management, and user feedback
 */

/**
 * Initialize tab navigation
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
 */
function switchTab(tabName) {
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.add('hidden');
    });
    
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.classList.remove('active');
        button.classList.add('inactive');
    });
    
    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) {
        selectedTab.classList.remove('hidden');
    }
    
    const selectedButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (selectedButton) {
        selectedButton.classList.add('active');
        selectedButton.classList.remove('inactive');
    }
}

/**
 * Update console output
 */
function updateConsole(message, append = false) {
    const consoleEl = document.getElementById('output-console');
    if (consoleEl) {
        if (append) {
            consoleEl.textContent += '\n' + message;
        } else {
            consoleEl.textContent = message;
        }
        consoleEl.scrollTop = consoleEl.scrollHeight;
    }
}

/**
 * Clear console
 */
function clearConsole() {
    const consoleEl = document.getElementById('output-console');
    if (consoleEl) {
        consoleEl.textContent = '';
    }
}

/**
 * Log message to console
 */
function logMessage(message) {
    updateConsole(message, true);
}

/**
 * Update LiDAR status display
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
 */
function getDischargeValue() {
    const input = document.getElementById('discharge-input');
    return input ? parseFloat(input.value) : 300;
}

/**
 * Set discharge input value
 */
function setDischargeValue(value) {
    const input = document.getElementById('discharge-input');
    if (input) {
        input.value = value;
    }
}

/**
 * Get GeoJSON file input
 */
function getGeoJsonFile() {
    const input = document.getElementById('geojson-upload');
    return input?.files[0] || null;
}

/**
 * Get LiDAR CSV file input
 */
function getLidarCsvFile() {
    const input = document.getElementById('lidar-csv-upload');
    return input?.files[0] || null;
}

/**
 * Get LiDAR GeoJSON file input
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
 */
function showError(message) {
    updateConsole(`✗ Error: ${message}`);
    console.error(message);
}

/**
 * Show success message
 */
function showSuccess(message) {
    updateConsole(`✓ ${message}`);
    console.log(message);
}

/**
 * Update river count in data tab
 */
function updateRiverCount(count) {
    const el = document.getElementById('river-count');
    if (el) {
        el.textContent = count;
    }
}

/**
 * Export data as JSON file
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
 */
function setButtonLoading(buttonId, show = true) {
    const btn = document.getElementById(buttonId);
    if (btn) {
        if (show) {
            btn.disabled = true;
            btn.innerHTML = '<i class="ph-spinner ph-spin ph-lg"></i> Processing...';
        } else {
            btn.disabled = false;
            if (buttonId === 'run-analysis-btn') {
                btn.innerHTML = '<i class="ph-play-circle ph-lg"></i> Run Analysis';
            } else if (buttonId === 'merge-lidar-btn') {
                btn.innerHTML = '<i class="ph-plus"></i> Merge LiDAR Data';
            }
        }
    }
}

console.log('UI manager module loaded');
