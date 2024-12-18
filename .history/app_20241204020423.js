// Sheety API configuration
const SHEETY_API_ID = 'd9da852d0370030da19c227582af6f3a';
const SHEETY_PROJECT = 'chata';
const SHEETY_BASE_URL = `https://api.sheety.co/${SHEETY_API_ID}/${SHEETY_PROJECT}`;
const ALL_URL_API = `${SHEETY_BASE_URL}/allUrl`;
const R3_FORM_API = `${SHEETY_BASE_URL}/r3Form`;
const STORAGE_KEY = 'formR3_fieldContents';

// Cache configuration
const CACHE_KEYS = {
    CHATA_DATA: 'chataData_cache',
    FORM_DATA: 'submitted_forms_cache',
    PDF_URLS: 'pdf_urls_cache',
    TIMESTAMP: 'cache_timestamp'
};

let chataData = [];

// Function to check if cache is valid
function isCacheValid(key) {
    try {
        const data = getCachedData(key);
        if (!data) return false;
        
        // For CHATA data, check if we have at least 2 entries
        if (key === CACHE_KEYS.CHATA_DATA) {
            return Array.isArray(data) && data.length >= 2;
        }
        
        return true;
    } catch (error) {
        console.error('Error checking cache validity:', error);
        return false;
    }
}

// Function to get cached data
function getCachedData(key) {
    try {
        const cachedData = localStorage.getItem(key);
        return cachedData ? JSON.parse(cachedData) : null;
    } catch (error) {
        console.error('Error reading from cache:', error);
        return null;
    }
}

// Function to set cache data
function setCacheData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Error setting cache:', error);
    }
}

// Function to clear all cache
function clearAllCache() {
    Object.values(CACHE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
}

// Function to populate dropdown
function populateDropdown(data) {
    const dropdown = document.getElementById('chata-id-select');
    if (dropdown && data && data.length > 0) {
        dropdown.innerHTML = '<option value="">Select CHATA ID</option>' +
            data.map(item => `<option value="${item.id}">${item.id} - ${item.name}</option>`).join('');
        console.log('Populated dropdown with options:', dropdown.innerHTML);
    } else {
        console.error('Dropdown issues:', {
            dropdownExists: !!dropdown,
            dataLength: data?.length || 0
        });
    }
}

// Function to load all required data
async function loadAllData(forceRefresh = false) {
    try {
        // Check cache first unless force refresh is requested
        if (!forceRefresh && isCacheValid(CACHE_KEYS.CHATA_DATA)) {
            const cachedChataData = getCachedData(CACHE_KEYS.CHATA_DATA);
            const cachedFormData = getCachedData(CACHE_KEYS.FORM_DATA);

            console.log('Using cached data');
            chataData = cachedChataData;
            populateDropdown(chataData);
            return {
                chataData: cachedChataData,
                formData: cachedFormData
            };
        }

        console.log('Fetching fresh data from API');
        
        // Fetch CHATA data
        const chataResponse = await fetch(ALL_URL_API);
        if (!chataResponse.ok) {
            throw new Error('Failed to fetch CHATA data');
        }

        const json = await chataResponse.json();
        if (!json || !json.allUrl) {
            throw new Error('Invalid data format received from API');
        }

        // Process and cache CHATA data
        chataData = json.allUrl
            .filter(row => row.chataId && row.chataId !== "CHATA_ID")
            .map(row => ({
                id: row.chataId,
                name: row.childName || '',
                r1Url: row['r1Generated (pdf)'] || null,
                r2Url: row['r2Generated (pdf)'] || null
            }));

        // Cache the data
        setCacheData(CACHE_KEYS.CHATA_DATA, chataData);
        
        // Fetch form data
        const formResponse = await fetch(R3_FORM_API);
        if (formResponse.ok) {
            const formData = await formResponse.json();
            if (formData && formData.r3Form) {
                setCacheData(CACHE_KEYS.FORM_DATA, formData.r3Form);
            }
        }

        // Populate dropdown
        populateDropdown(chataData);

        return {
            chataData,
            formData: getCachedData(CACHE_KEYS.FORM_DATA) || []
        };

    } catch (error) {
        console.error('Error loading data:', error);
        // Try to use cached data as fallback
        const cachedData = getCachedData(CACHE_KEYS.CHATA_DATA);
        if (cachedData && cachedData.length > 0) {
            console.log('Using cached data as fallback');
            chataData = cachedData;
            populateDropdown(chataData);
            return {
                chataData: cachedData,
                formData: getCachedData(CACHE_KEYS.FORM_DATA) || []
            };
        }
        throw error;
    }
}

// Function to check for existing submission
async function checkExistingSubmission(chataId) {
    try {
        let existingSubmission = null;
        
        // First check cache
        const cachedFormData = getCachedData(CACHE_KEYS.FORM_DATA);
        if (cachedFormData) {
            existingSubmission = cachedFormData.find(form => form.chataId === chataId);
        } else {
            // If no cache, check API
            console.log('No cache found, checking API for existing submission');
            const response = await fetch(R3_FORM_API);
            if (response.ok) {
                const data = await response.json();
                if (data && data.r3Form) {
                    setCacheData(CACHE_KEYS.FORM_DATA, data.r3Form);
                    existingSubmission = data.r3Form.find(form => form.chataId === chataId);
                }
            }
        }
        
        // Remove any existing warnings
        const oldWarning = document.querySelector('.existing-submission-warning');
        const oldSubmitWarning = document.querySelector('.submit-warning');
        if (oldWarning) oldWarning.remove();
        if (oldSubmitWarning) oldSubmitWarning.remove();

        if (existingSubmission) {
            // Add header warning
            const warning = document.createElement('div');
            warning.className = 'existing-submission-warning';
            warning.innerHTML = `
                <i class="material-icons">warning</i>
                <span>Assessment submitted on ${new Date(existingSubmission.timestamp).toLocaleDateString()}</span>
            `;
            
            const headerControls = document.querySelector('.header-controls');
            headerControls.appendChild(warning);

            // Add submit button warning
            const submitWarning = document.createElement('div');
            submitWarning.className = 'submit-warning';
            submitWarning.innerHTML = `
                <i class="material-icons">info</i>
                <span>Submitting will update the existing assessment</span>
            `;
            
            const buttonGroup = document.querySelector('.button-group');
            if (!buttonGroup.querySelector('.submit-warning')) {
                buttonGroup.insertBefore(submitWarning, buttonGroup.firstChild);
            }
        }
    } catch (error) {
        console.error('Error checking existing submission:', error);
    }
}

// Function to handle CHATA ID change
async function handleChataIdChange(event) {
    const selectedId = event.target.value;
    const selectedData = chataData.find(item => item.id === selectedId);
    
    if (selectedData) {
        // Check for existing submission
        await checkExistingSubmission(selectedId);

        // First check PDF URLs in cache
        const cachedUrls = getCachedData(CACHE_KEYS.PDF_URLS) || {};
        
        if (cachedUrls[selectedId]) {
            console.log('Using cached PDF URLs for:', selectedId);
            updatePdfViewers(cachedUrls[selectedId]);
        } else if (selectedData.r1Url || selectedData.r2Url) {
            console.log('Caching new PDF URLs for:', selectedId);
            cachedUrls[selectedId] = {
                r1Url: selectedData.r1Url,
                r2Url: selectedData.r2Url
            };
            setCacheData(CACHE_KEYS.PDF_URLS, cachedUrls);
            updatePdfViewers(cachedUrls[selectedId]);
        } else {
            resetPdfViewers();
        }
    } else {
        resetPdfViewers();
        removeWarnings();
    }
}

// Function to update PDF viewers
function updatePdfViewers(urls) {
    const frame1 = document.getElementById('pdf-frame-1');
    const frame2 = document.getElementById('pdf-frame-2');
    const placeholder1 = document.getElementById('pdf-placeholder-1');
    const placeholder2 = document.getElementById('pdf-placeholder-2');
    
    if (frame1 && urls.r1Url) {
        console.log('Setting R1 PDF URL:', urls.r1Url);
        frame1.src = urls.r1Url;
        frame1.style.display = 'block';
        if (placeholder1) placeholder1.style.display = 'none';
    }
    if (frame2 && urls.r2Url) {
        console.log('Setting R2 PDF URL:', urls.r2Url);
        frame2.src = urls.r2Url;
        frame2.style.display = 'block';
        if (placeholder2) placeholder2.style.display = 'none';
    }
}

// Function to reset PDF viewers
function resetPdfViewers() {
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
        if (placeholder) {
            placeholder.style.display = 'block';
        }
    });
}

// Function to remove warnings
function removeWarnings() {
    const warnings = document.querySelectorAll('.existing-submission-warning, .submit-warning');
    warnings.forEach(warning => warning.remove());
}

// Field configuration
const fieldConfig = {
    'clinical-observations': {
        title: 'Key Clinical Observations',
        defaultText: `• Social engagement patterns
• Communication style
• Response to activities
• Behavioral patterns
• Notable strengths/challenges`,
        charLimit: 2000
    },
    'strengths-abilities': {
        title: 'Strengths & Abilities',
        defaultText: `• Memory (e.g., Strong recall of sequences)
• Visual (e.g., Pattern recognition)
• Physical (e.g., Fine motor skills)
• Creative (e.g., Problem-solving abilities)
• Focus (e.g., Sustained attention)
• Problem-solving (e.g., Logical approach)`,
        charLimit: 2000
    },
    'priority-support': {
        title: 'Priority Support Areas',
        defaultText: `• Assessment data patterns
• Family priorities
• School observations
• Clinical judgment`,
        charLimit: 2000
    },
    'support-recommendations': {
        title: 'Support Recommendations',
        defaultText: `• Strength-based strategies
• Practical implementation
• Home/school alignment
• Family resources`,
        charLimit: 2000
    }
};

// Initialize window.fieldContents
window.fieldContents = window.fieldContents || {
    referrals: {
        checked: [],
        remarks: ''
    }
};

// Load saved data from localStorage
function loadSavedData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            window.fieldContents = JSON.parse(saved);
            
            // Load expandable field contents
            Object.keys(window.fieldContents).forEach(fieldId => {
                if (fieldId !== 'referrals') {  // Skip referrals object
                    const preview = document.querySelector(`[data-field-id="${fieldId}"] .field-preview`);
                    if (preview) {
                        const content = window.fieldContents[fieldId];
                        preview.textContent = content || fieldConfig[fieldId].defaultText;
                    }
                }
            });

            // Load referral checkboxes
            if (window.fieldContents.referrals) {
                const checkboxes = document.querySelectorAll('.referrals-grid input[type="checkbox"]');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = window.fieldContents.referrals.checked.includes(checkbox.value);
                });
                
                // Load remarks
                const remarksInput = document.querySelector('input[name="other_referrals"]');
                if (remarksInput && window.fieldContents.referrals.remarks) {
                    remarksInput.value = window.fieldContents.referrals.remarks;
                }
            }

        } catch (e) {
            console.error('Error loading saved data:', e);
        }
    }
}

// Save data to localStorage
function saveToLocalStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(window.fieldContents));
    } catch (e) {
        console.error('Error saving to localStorage:', e);
    }
}

// Initialize event listeners and load data
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check if we have sufficient cached data
        if (isCacheValid(CACHE_KEYS.CHATA_DATA)) {
            console.log('Using cached data for initial load');
            await loadAllData(false); // Use cache if available
        } else {
            console.log('Insufficient cached data, performing fresh load');
            await loadAllData(true); // Force refresh
        }

        const chataIdSelect = document.getElementById('chata-id-select');
        if (chataIdSelect) {
            chataIdSelect.addEventListener('change', handleChataIdChange);
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

        // Add refresh button listener
        const refreshButton = document.getElementById('refresh-data');
        if (refreshButton) {
            refreshButton.addEventListener('click', async () => {
                try {
                    refreshButton.classList.add('loading');
                    await loadAllData(true); // Force refresh all data
                    alert('Data refreshed successfully!');
                } catch (error) {
                    console.error('Error refreshing data:', error);
                    alert('Error refreshing data. Please try again.');
                } finally {
                    refreshButton.classList.remove('loading');
                }
            });
        }

    } catch (error) {
        console.error('Error initializing app:', error);
        alert('Error loading application data. Please refresh the page.');
    }
});

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
    
    modalHeader.textContent = fieldConfig[fieldId].title;
    textarea.value = currentContent;
    textarea.maxLength = fieldConfig[fieldId].charLimit;

    const inputHandler = debounce(() => {
        const value = textarea.value.trim();
        window.fieldContents[fieldId] = value;
        saveToLocalStorage();
        
        const preview = document.querySelector(`[data-field-id="${fieldId}"] .field-preview`);
        if (preview) {
            preview.textContent = value || fieldConfig[fieldId].defaultText;
        }
    }, 300);

    textarea.addEventListener('input', inputHandler);

    const closeHandler = () => {
        textarea.removeEventListener('input', inputHandler);
        backdrop.removeEventListener('click', closeHandler);
        modal.classList.remove('active');
        backdrop.classList.remove('active');
    };

    backdrop.addEventListener('click', closeHandler);
    modal.classList.add('active');
    backdrop.classList.add('active');
    textarea.focus();
}

// Add debounce function
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

// Handle form submission
async function handleSubmit() {
    try {
        const chataIdSelect = document.getElementById('chata-id-select');
        const selectedChataId = chataIdSelect?.value;
        const selectedData = chataData.find(item => item.id === selectedChataId);
        
        if (!selectedChataId || !selectedData) {
            alert('Please select a CHATA ID');
            return;
        }

        // Get ASC and ADHD status
        const ascStatus = document.querySelector('select[name="asc_status"]')?.value;
        const adhdStatus = document.querySelector('select[name="adhd_status"]')?.value;

        if (!ascStatus || !adhdStatus) {
            alert('Please select both ASC and ADHD status');
            return;
        }

        // First check if an entry already exists
        console.log('Checking for existing entries...');
        const checkResponse = await fetch(R3_FORM_API);
        if (!checkResponse.ok) {
            throw new Error('Failed to check existing entries');
        }

        const existingData = await checkResponse.json();
        console.log('Raw response from Sheety:', existingData);

        // Check the response structure
        if (!existingData || !existingData.r3Form) {
            console.error('Unexpected API response structure:', existingData);
            throw new Error('Invalid API response format');
        }

        // Find existing entry by CHATA_ID
        const existingEntry = existingData.r3Form.find(entry => 
            entry.chataId === selectedChataId || entry.CHATA_ID === selectedChataId
        );

        console.log('Checking for CHATA_ID:', selectedChataId);
        console.log('Found existing entry:', existingEntry);

        // Get referrals data
        const professionalReferrals = window.fieldContents.referrals ? 
            `Selected referrals: ${window.fieldContents.referrals.checked.join(', ')}${window.fieldContents.referrals.remarks ? `\nRemarks: ${window.fieldContents.referrals.remarks}` : ''}` :
            'No referrals selected';

        // Prepare the form data in Sheety's format
        const formData = {
            r3Form: {
                chataId: selectedChataId,
                name: selectedData.name,
                timestamp: new Date().toISOString(),
                ascStatus: ascStatus,
                adhdStatus: adhdStatus,
                keyClinicialObservations: window.fieldContents['clinical-observations'] || '',
                strengthsAndAbilities: window.fieldContents['strengths-abilities'] || '',
                prioritySupportAreas: window.fieldContents['priority-support'] || '',
                supportRecommendations: window.fieldContents['support-recommendations'] || '',
                professionalReferrals: professionalReferrals
            }
        };

        console.log('Attempting to submit form data:', formData);

        let submitResponse;
        if (existingEntry) {
            // Update existing entry
            const updateUrl = `${R3_FORM_API}/${existingEntry.id}`;
            console.log('Updating existing entry at:', updateUrl);
            
            submitResponse = await fetch(updateUrl, {
                method: 'PUT',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
        } else {
            // Create new entry
            console.log('Creating new entry');
            submitResponse = await fetch(R3_FORM_API, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
        }

        const responseData = await submitResponse.json();
        console.log('API Response:', {
            status: submitResponse.status,
            statusText: submitResponse.statusText,
            headers: Object.fromEntries([...submitResponse.headers]),
            data: responseData,
            requestBody: formData
        });

        if (!submitResponse.ok) {
            throw new Error(`API Error: ${submitResponse.status} - ${JSON.stringify(responseData)}`);
        }

        // Verify the response contains the created/updated entry
        if (!responseData.r3Form) {
            throw new Error('API returned success but no entry was created/updated');
        }

        console.log('Form submitted successfully:', responseData);
        alert(existingEntry ? 'Assessment updated successfully!' : 'Assessment submitted successfully!');

        if (confirm('Would you like to clear the form?')) {
            clearForm();
        }

    } catch (error) {
        console.error('Submission error:', error);
        alert(`Error submitting form: ${error.message}`);
    }
}

// Clear form
function clearForm() {
    if (confirm('Are you sure you want to clear all form data? This cannot be undone.')) {
        localStorage.removeItem(STORAGE_KEY);
        window.fieldContents = {
            referrals: {
                checked: [],
                remarks: ''
            }
        };
        
        const chataIdSelect = document.getElementById('chata-id-select');
        if (chataIdSelect) {
            chataIdSelect.selectedIndex = 0;
            chataIdSelect.dispatchEvent(new Event('change'));
        }

        document.querySelectorAll('select').forEach(select => {
            select.selectedIndex = 0;
        });
        
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        const otherReferralsInput = document.querySelector('input[name="other_referrals"]');
        if (otherReferralsInput) {
            otherReferralsInput.value = '';
        }
        
        document.querySelectorAll('.field-preview').forEach(preview => {
            const field = preview.closest('.expandable-field');
            const fieldId = field.dataset.fieldId;
            preview.textContent = fieldConfig[fieldId].defaultText;
        });
        
        alert('Form cleared successfully.');
    }
}

// Add event listeners for referrals section
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

// Function to save referrals state
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

// Test function to verify the endpoint
async function testSheety() {
    try {
        // Test GET request
        console.log('Testing GET endpoint:', R3_FORM_API);
        const getResponse = await fetch(R3_FORM_API);
        const getData = await getResponse.json();
        console.log('GET test response:', getData);

        // Test POST request structure
        const testData = {
            r3Form: {
                CHATA_ID: 'TEST123',
                Name: 'Test Entry',
                Timestamp: new Date().toISOString()
            }
        };
        console.log('Testing POST data structure:', testData);
    } catch (error) {
        console.error('Sheety API test error:', error);
    }
}

// Call test on page load
document.addEventListener('DOMContentLoaded', () => {
    testSheety();
    // ... rest of your initialization code ...
});

