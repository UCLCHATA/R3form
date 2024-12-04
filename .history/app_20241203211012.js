// Cache configuration
const CACHE_KEYS = {
    CHATA_DATA: 'chataData_cache',
    CACHE_TIMESTAMP: 'chataData_timestamp',
    CACHE_DURATION: 1000 * 60 * 60 * 24 // 24 hours in milliseconds
};

// Sheety API configuration
const SHEETY_BASE_URL = 'https://api.sheety.co/UCL/chata';
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

        console.log('Fetching fresh data from API');
        const response = await fetch(ALL_URL_API, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch CHATA data');
        }

        const data = await response.json();
        console.log('Raw CHATA data from All_URL:', data);
        
        // Map the data from Sheety's response format
        chataData = data.allUrl
            .filter(row => {
                const id = row.chataId;
                const name = row.name;
                console.log('Processing row:', { id, name });
                return id && id !== "CHATA_ID" && name;
            })
            .map(row => ({
                id: row.chataId,
                name: row.name,
                r1Url: row.r1Generated,
                r2Url: row.r2Generated
            }));

        console.log('Processed CHATA data:', chataData);
        
        // Update cache with new data
        setCacheData(chataData);
        
        // Update dropdown
        updateChataDropdown();

    } catch (error) {
        console.error('Error loading CHATA data:', error);
        // If API call fails and we have cached data, use it as fallback
        const cachedData = getCachedData();
        if (cachedData) {
            console.log('Using cached data as fallback');
            chataData = cachedData;
            updateChataDropdown();
        }
    }
}

// Separate function to update dropdown
function updateChataDropdown() {
    const dropdown = document.getElementById('chata-id-select');
    if (dropdown && chataData.length > 0) {
        dropdown.innerHTML = '<option value="">Select CHATA ID</option>' +
            chataData.map(item => `<option value="${item.id}">${item.id}</option>`).join('');
        console.log('Populated dropdown with options:', dropdown.innerHTML);
    } else {
        console.error('Dropdown issues:', {
            dropdownExists: !!dropdown,
            dataLength: chataData.length
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

        // First check for existing entries
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

