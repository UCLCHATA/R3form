// Cache configuration
const CACHE_KEYS = {
    CHATA_DATA: 'chataData_cache',
    CACHE_TIMESTAMP: 'chataData_timestamp',
    CACHE_DURATION: 1000 * 60 * 60 * 24 // 24 hours in milliseconds
};

// Sheety API configuration
const SHEETY_API_ID = 'd9da852d0370030da19c227582af6f3a';
const SHEETY_PROJECT = 'chata';
const SHEETY_BASE_URL = `https://api.sheety.co/${SHEETY_API_ID}/${SHEETY_PROJECT}`;
const ALL_URL_API = `${SHEETY_BASE_URL}/allUrl`;
const R3_FORM_API = `${SHEETY_BASE_URL}/r3Form`;
const STORAGE_KEY = 'formR3_fieldContents';
let chataData = [];

// Function to check if cache is valid
function isCacheValid() {
    const timestamp = localStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP);
    if (!timestamp) return false;
    
    const now = new Date().getTime();
    const cacheTime = parseInt(timestamp);
    return (now - cacheTime) < CACHE_KEYS.CACHE_DURATION;
}

// Function to get cached data
function getCachedData() {
    try {
        const cachedData = localStorage.getItem(CACHE_KEYS.CHATA_DATA);
        return cachedData ? JSON.parse(cachedData) : null;
    } catch (error) {
        console.error('Error reading from cache:', error);
        return null;
    }
}

// Function to set cache data
function setCacheData(data) {
    try {
        localStorage.setItem(CACHE_KEYS.CHATA_DATA, JSON.stringify(data));
        localStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMP, new Date().getTime().toString());
    } catch (error) {
        console.error('Error setting cache:', error);
    }
}

// Function to clear cache
function clearCache() {
    try {
        localStorage.removeItem(CACHE_KEYS.CHATA_DATA);
        localStorage.removeItem(CACHE_KEYS.CACHE_TIMESTAMP);
    } catch (error) {
        console.error('Error clearing cache:', error);
    }
}

async function loadChataData(forceRefresh = false) {
    try {
        // Check cache first unless force refresh is requested
        if (!forceRefresh && isCacheValid()) {
            const cachedData = getCachedData();
            if (cachedData) {
                console.log('Loading data from cache');
                chataData = cachedData;
                updateChataDropdown();
                return;
            }
        }

        console.log('Fetching fresh data from API:', ALL_URL_API);
        
        const response = await fetch(ALL_URL_API);
        const json = await response.json();
        console.log('Raw CHATA data:', json);
        
        if (!json || !json.allUrl) {
            console.error('Invalid data structure:', json);
            throw new Error('Invalid data format received from API');
        }

        // Log the first row to see the structure
        if (json.allUrl.length > 0) {
            console.log('First row structure:', json.allUrl[0]);
        }

        // Map the data from Sheety's response format using exact column names
        chataData = json.allUrl
            .filter(row => {
                // Log the entire row to see what fields are available
                console.log('Row data:', row);
                return row.chataId && row.chataId !== "CHATA_ID"; // Sheety converts CHATA_ID to chataId
            })
            .map(row => ({
                id: row.chataId,                    // CHATA_ID becomes chataId in Sheety
                name: row.childName || '',          // Child_Name becomes childName
                r1Url: row.r1GeneratedPdf || '',    // R1_Generated (PDF) becomes r1GeneratedPdf
                r2Url: row.r2GeneratedPdf || ''     // R2_Generated (PDF) becomes r2GeneratedPdf
            }));

        console.log('Processed CHATA data:', chataData);
        
        // Update cache with new data
        setCacheData(chataData);
        
        // Update dropdown
        updateChataDropdown();

    } catch (error) {
        console.error('Error loading CHATA data:', error);
        const cachedData = getCachedData();
        if (cachedData) {
            console.log('Using cached data as fallback');
            chataData = cachedData;
            updateChataDropdown();
        }
        throw error;
    }
}

// Function to update the dropdown with CHATA data
function updateChataDropdown() {
    const dropdown = document.getElementById('chata-id-select');
    if (dropdown) {
        dropdown.innerHTML = '<option value="">Select CHATA ID</option>' +
            chataData
                .filter(item => item.id) // Ensure we have an ID
                .map(item => {
                    const displayText = item.name ? 
                        `${item.id} - ${item.name}` : 
                        item.id;
                    return `<option value="${item.id}">${displayText}</option>`;
                })
                .join('');
        console.log('Populated dropdown with options:', dropdown.innerHTML);
    } else {
        console.error('Dropdown element not found');
    }
}

// Function to handle CHATA ID selection change
function handleChataIdChange(event) {
    const selectedId = event.target.value;
    const nameDisplay = document.getElementById('chata-name-display');
    const selectedData = chataData.find(item => item.id === selectedId);
    
    if (nameDisplay && selectedData) {
        nameDisplay.textContent = selectedData.name;
        
        // Update PDF iframes if they exist and have URLs
        if (selectedData.r1Url || selectedData.r2Url) {
            const frame1 = document.getElementById('pdf-frame-1');
            const frame2 = document.getElementById('pdf-frame-2');
            const placeholder1 = document.getElementById('pdf-placeholder-1');
            const placeholder2 = document.getElementById('pdf-placeholder-2');
            
            if (frame1 && selectedData.r1Url) {
                console.log('Setting R1 PDF URL:', selectedData.r1Url);
                frame1.src = selectedData.r1Url;
                frame1.style.display = 'block';
                if (placeholder1) placeholder1.style.display = 'none';
            }
            if (frame2 && selectedData.r2Url) {
                console.log('Setting R2 PDF URL:', selectedData.r2Url);
                frame2.src = selectedData.r2Url;
                frame2.style.display = 'block';
                if (placeholder2) placeholder2.style.display = 'none';
            }
        } else {
            console.log('No PDF URLs available for:', selectedId);
        }
    } else if (nameDisplay) {
        nameDisplay.textContent = '';
        // Reset PDFs to placeholder state
        const frames = [
            document.getElementById('pdf-frame-1'),
            document.getElementById('pdf-frame-2')
        ];
        const placeholders = [
            document.getElementById('pdf-placeholder-1'),
            document.getElementById('pdf-placeholder-2')
        ];
        
        frames.forEach(frame => {
            if (frame) {
                frame.src = 'about:blank';
                frame.style.display = 'none';
            }
        });
        
        placeholders.forEach(placeholder => {
            if (placeholder) placeholder.style.display = 'flex';
        });
    }
}

// Add a refresh button handler
async function handleRefreshData() {
    const refreshButton = document.getElementById('refresh-data');
    if (refreshButton) {
        refreshButton.classList.add('loading');
        refreshButton.disabled = true;
    }

    try {
        await loadChataData(true); // Force refresh from API
        alert('CHATA data refreshed successfully!');
    } catch (error) {
        console.error('Error refreshing data:', error);
        alert('Failed to refresh CHATA data. Please try again.');
    } finally {
        if (refreshButton) {
            refreshButton.classList.remove('loading');
            refreshButton.disabled = false;
        }
    }
}

// Initialize event listeners and load data
document.addEventListener('DOMContentLoaded', async () => {
    // Load CHATA data
    await loadChataData();

    const chataIdSelect = document.getElementById('chata-id-select');
    if (chataIdSelect) {
        chataIdSelect.addEventListener('change', handleChataIdChange);
    }

    // Add refresh button if it exists
    const refreshButton = document.getElementById('refresh-data');
    if (refreshButton) {
        refreshButton.addEventListener('click', handleRefreshData);
    }

    // Initialize modal elements
    initializeModal();
    
    // Load saved data
    loadSavedData();

    // Add submit button listener
    const submitButton = document.querySelector('.submit-button');
    if (submitButton) {
        submitButton.addEventListener('click', handleSubmit);
    }

    // Initialize expandable fields
    initializeExpandableFields();

    // Add event listeners for referrals section
    initializeReferrals();
});

async function handleSubmit() {
    try {
        const chataIdSelect = document.getElementById('chata-id-select');
        const selectedChataId = chataIdSelect?.value;
        const selectedData = chataData.find(item => item.id === selectedChataId);
        
        if (!selectedChataId || !selectedData) {
            alert('Please select a CHATA ID');
            return;
        }

        const ascStatus = document.querySelector('select[name="asc_status"]')?.value;
        const adhdStatus = document.querySelector('select[name="adhd_status"]')?.value;

        if (!ascStatus || !adhdStatus) {
            alert('Please select both ASC and ADHD status');
            return;
        }

        // Get referrals data
        const professionalReferrals = window.fieldContents.referrals ? 
            `Selected referrals: ${window.fieldContents.referrals.checked.join(', ')}${window.fieldContents.referrals.remarks ? `\nRemarks: ${window.fieldContents.referrals.remarks}` : ''}` :
            'No referrals selected';

        // Check for existing entries using filter
        const existingEntriesResponse = await fetch(`${R3_FORM_API}?filter[chataId]=${selectedChataId}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!existingEntriesResponse.ok) {
            throw new Error('Failed to check existing entries');
        }

        const existingEntries = await existingEntriesResponse.json();
        console.log('Matching entries:', existingEntries);

        // Delete existing entries if found
        if (existingEntries.r3Form && existingEntries.r3Form.length > 0) {
            const userChoice = confirm(
                `An assessment for ${selectedChataId} already exists.\n\n` +
                'Click OK to update the existing assessment, or Cancel to abort submission.'
            );
            
            if (!userChoice) {
                return; // User chose to cancel
            }

            // Delete existing entries
            for (const entry of existingEntries.r3Form) {
                const deleteUrl = `${R3_FORM_API}/${entry.id}`;
                console.log('Deleting entry at:', deleteUrl);

                const deleteResponse = await fetch(deleteUrl, {
                    method: 'DELETE',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });

                if (!deleteResponse.ok) {
                    throw new Error(`Failed to delete entry ${entry.id}`);
                }

                console.log(`Deleted entry ${entry.id}`);
            }
        }

        // Create new entry using Sheety's expected format
        const formData = {
            r3Form: {
                chataId: selectedChataId,
                name: selectedData.name,
                timestamp: new Date().toISOString(),
                ascStatus: ascStatus,
                adhdStatus: adhdStatus,
                keyClinicalObservations: window.fieldContents['clinical-observations'] || '',
                strengthsAndAbilities: window.fieldContents['strengths-abilities'] || '',
                prioritySupportAreas: window.fieldContents['priority-support'] || '',
                supportRecommendations: window.fieldContents['support-recommendations'] || '',
                professionalReferrals: professionalReferrals
            }
        };

        const createResponse = await fetch(R3_FORM_API, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.error('Create response:', errorText);
            throw new Error(`Failed to create new entry. Status: ${createResponse.status}`);
        }

        const result = await createResponse.json();
        console.log('Create result:', result);

        alert('Assessment submitted successfully!');

        if (confirm('Would you like to clear the form?')) {
            clearForm();
        }

    } catch (error) {
        console.error('Submission error:', error);
        alert(`Error submitting form: ${error.message}`);
    }
}

// Initialize modal functionality
function initializeModal() {
    const modal = document.querySelector('.modal-container');
    const backdrop = document.querySelector('.modal-backdrop');
    
    if (!modal || !backdrop) {
        console.log('Modal elements not found, skipping modal initialization');
        return;
    }

    backdrop.addEventListener('click', () => {
        modal.classList.remove('active');
        backdrop.classList.remove('active');
    });

    let isResizing = false;
    modal.addEventListener('mousedown', (e) => {
        if (e.offsetX > modal.offsetWidth - 10 && e.offsetY > modal.offsetHeight - 10) {
            isResizing = true;
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (isResizing) {
            modal.style.width = e.clientX - modal.offsetLeft + 'px';
            modal.style.height = e.clientY - modal.offsetTop + 'px';
        }
    });

    document.addEventListener('mouseup', () => {
        isResizing = false;
    });
}

// Initialize expandable fields
function initializeExpandableFields() {
    document.querySelectorAll('.expandable-field').forEach(field => {
        const preview = field.querySelector('.field-preview');
        const fieldId = field.dataset.fieldId;
        
        if (preview) {
            preview.addEventListener('click', () => {
                openFieldEditor(fieldId, preview.textContent);
            });
        }
    });
}

// Open field editor
function openFieldEditor(fieldId, currentContent) {
    const modal = document.querySelector('.modal-container');
    const backdrop = document.querySelector('.modal-backdrop');
    const modalHeader = modal.querySelector('.modal-header h4');
    const textarea = modal.querySelector('.expandable-text');
    
    if (!modal || !backdrop || !modalHeader || !textarea) {
        console.error('Required modal elements not found');
        return;
    }

    modalHeader.textContent = fieldConfig[fieldId]?.title || 'Edit Field';
    textarea.value = window.fieldContents[fieldId] || fieldConfig[fieldId]?.defaultText || '';
    textarea.maxLength = fieldConfig[fieldId]?.charLimit || 2000;
    modal.dataset.currentField = fieldId;

    modal.classList.add('active');
    backdrop.classList.add('active');
    textarea.focus();
}

// Initialize referrals section
function initializeReferrals() {
    const checkboxes = document.querySelectorAll('.referrals-grid input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', saveReferrals);
    });

    const remarksInput = document.querySelector('input[name="other_referrals"]');
    if (remarksInput) {
        remarksInput.addEventListener('input', debounce(saveReferrals, 500));
    }
}

// Save referrals state
function saveReferrals() {
    const checkboxes = document.querySelectorAll('.referrals-grid input[type="checkbox"]');
    const checkedValues = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    const remarksInput = document.querySelector('input[name="other_referrals"]');
    const remarks = remarksInput ? remarksInput.value : '';

    window.fieldContents.referrals = {
        checked: checkedValues,
        remarks: remarks
    };

    saveToLocalStorage();
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

