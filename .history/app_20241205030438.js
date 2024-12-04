// Import text box functionality
import './js/text-boxes.js';

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
        
        // Clear any existing timeouts
        if (window.fadeOutTimeout) {
            clearTimeout(window.fadeOutTimeout);
            window.fadeOutTimeout = null;
        }
        if (window.submitFadeOutTimeout) {
            clearTimeout(window.submitFadeOutTimeout);
            window.submitFadeOutTimeout = null;
        }
        
        // Remove any existing warnings
        const oldWarning = document.querySelector('.existing-submission-warning');
        const oldSubmitWarning = document.querySelector('.submit-warning');
        if (oldWarning) oldWarning.remove();
        if (oldSubmitWarning) oldSubmitWarning.remove();

        // Reset refresh button state and remove old event listeners
        const refreshButton = document.getElementById('refresh-data');
        refreshButton.classList.remove('warning', 'loading');
        refreshButton.innerHTML = '<i class="material-icons">refresh</i>';
        
        // Clone and replace refresh button to remove old event listeners
        const newRefreshButton = refreshButton.cloneNode(true);
        refreshButton.parentNode.replaceChild(newRefreshButton, refreshButton);

        // Add refresh functionality to the button regardless of state
        const handleRefreshClick = async () => {
            const currentIcon = newRefreshButton.innerHTML;
            try {
                newRefreshButton.classList.add('loading');
                await loadAllData(true); // Force refresh all data
                await checkExistingSubmission(chataId); // Recheck submission after refresh
                showSuccess('Data refreshed successfully!');
            } catch (error) {
                console.error('Error refreshing data:', error);
                showError('Error refreshing data. Please try again.');
                // Restore original icon if error occurs
                newRefreshButton.innerHTML = currentIcon;
            } finally {
                newRefreshButton.classList.remove('loading');
            }
        };

        if (existingSubmission) {
            // Update refresh button to warning state
            newRefreshButton.classList.add('warning');
            newRefreshButton.innerHTML = '<i class="material-icons">warning</i>';
            
            // Add header warning (initially hidden)
            const warning = document.createElement('div');
            warning.className = 'existing-submission-warning';
            warning.innerHTML = `<span>Submission exists</span>`;
            
            const headerControls = document.querySelector('.header-controls');
            headerControls.appendChild(warning);

            // Add submit button warning
            const submitWarning = document.createElement('div');
            submitWarning.className = 'submit-warning';
            submitWarning.innerHTML = `
                <i class="material-icons">info</i>
                <span>Prior submission exists for this CHATA-ID, resubmit to replace existing</span>
            `;
            
            const buttonGroup = document.querySelector('.button-group');
            if (!buttonGroup.querySelector('.submit-warning')) {
                buttonGroup.insertBefore(submitWarning, buttonGroup.firstChild);
            }

            // Show both warnings temporarily
            requestAnimationFrame(() => {
                // Show header warning
                warning.classList.add('show');
                window.fadeOutTimeout = setTimeout(() => {
                    warning.classList.add('fade-out');
                    warning.classList.remove('show');
                }, 3000);

                // Show submit warning
                submitWarning.classList.add('show');
                window.submitFadeOutTimeout = setTimeout(() => {
                    submitWarning.classList.add('fade-out');
                    submitWarning.classList.remove('show');
                }, 10000);
            });

            // Setup hover behavior for refresh/warning button
            newRefreshButton.addEventListener('mouseenter', () => {
                const warning = document.querySelector('.existing-submission-warning');
                const submitWarning = document.querySelector('.submit-warning');
                
                if (warning) {
                    // Clear any existing timeouts
                    if (window.fadeOutTimeout) {
                        clearTimeout(window.fadeOutTimeout);
                        window.fadeOutTimeout = null;
                    }
                    if (window.submitFadeOutTimeout) {
                        clearTimeout(window.submitFadeOutTimeout);
                        window.submitFadeOutTimeout = null;
                    }
                    
                    // Show both warnings
                    warning.classList.remove('fade-out');
                    warning.classList.add('show');
                    if (submitWarning) {
                        submitWarning.classList.remove('fade-out');
                        submitWarning.classList.add('show');
                    }
                }
            });

            newRefreshButton.addEventListener('mouseleave', () => {
                const warning = document.querySelector('.existing-submission-warning');
                const submitWarning = document.querySelector('.submit-warning');
                
                if (warning) {
                    warning.classList.add('fade-out');
                    warning.classList.remove('show');
                }
                if (submitWarning && !document.querySelector('.submit-button:hover')) {
                    submitWarning.classList.add('fade-out');
                    submitWarning.classList.remove('show');
                }
            });

            // Setup hover behavior for submit button
            const submitButton = document.querySelector('.submit-button');
            if (submitButton) {
                submitButton.addEventListener('mouseenter', () => {
                    if (submitWarning) {
                        if (window.submitFadeOutTimeout) {
                            clearTimeout(window.submitFadeOutTimeout);
                            window.submitFadeOutTimeout = null;
                        }
                        submitWarning.classList.remove('fade-out');
                        submitWarning.classList.add('show');
                    }
                });

                submitButton.addEventListener('mouseleave', () => {
                    if (submitWarning && !document.querySelector('.refresh-button.warning:hover')) {
                        submitWarning.classList.add('fade-out');
                        submitWarning.classList.remove('show');
                    }
                });
            }
        }

        // Add click event listener for refresh functionality
        newRefreshButton.addEventListener('click', handleRefreshClick);

    } catch (error) {
        console.error('Error checking existing submission:', error);
    }
}

// Function to handle CHATA ID change
async function handleChataIdChange(event) {
    const selectedId = event.target.value;
    const selectedData = chataData.find(item => item.id === selectedId);
    const formContent = document.querySelector('.form-content');
    const pdfContainer = document.querySelector('.pdf-container');
    const buttonGroup = document.querySelector('.button-group');
    const refreshButton = document.getElementById('refresh-data');
    
    if (selectedData) {
        // Remove muted state when CHATA ID is selected
        formContent?.classList.remove('muted');
        pdfContainer?.classList.remove('muted');
        buttonGroup?.classList.remove('muted');
        
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
        // Add muted state when no CHATA ID is selected
        formContent?.classList.add('muted');
        pdfContainer?.classList.add('muted');
        buttonGroup?.classList.add('muted');
        
        // Reset refresh button to default state
        if (refreshButton) {
            refreshButton.classList.remove('warning');
            refreshButton.innerHTML = '<i class="material-icons">refresh</i>';
        }
        
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

// Function to test API endpoints
async function testApiEndpoints() {
    try {
        console.log('Testing GET endpoint:', R3_FORM_API);
        const getResponse = await fetch(R3_FORM_API);
        const getData = await getResponse.json();
        console.log('GET test response:', getData);

        // Test POST data structure
        const testData = {
            r3Form: {
                chataId: 'TEST123',
                timestamp: new Date().toISOString(),
                score: '5',
                comments: 'Test comment'
            }
        };
        console.log('Testing POST data structure:', testData);
        return true;
    } catch (error) {
        console.error('API test failed:', error);
        return false;
    }
}

// Function to handle form submission
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

        // Check for existing submission
        let existingSubmission = null;
        const formResponse = await fetch(R3_FORM_API);
        if (formResponse.ok) {
            const formData = await formResponse.json();
            if (formData && formData.r3Form) {
                existingSubmission = formData.r3Form.find(form => form.chataId === selectedChataId);
            }
        }

        if (existingSubmission && !confirm('An assessment already exists for this CHATA ID. Do you want to update it?')) {
            return;
        }

        // Get referrals data
        const professionalReferrals = window.fieldContents.referrals ? 
            `Selected referrals: ${window.fieldContents.referrals.checked.join(', ')}${window.fieldContents.referrals.remarks ? `\nRemarks: ${window.fieldContents.referrals.remarks}` : ''}` :
            'No referrals selected';

        // Prepare the form data
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

        console.log('Submitting form data:', formData);

        // Submit to API with appropriate method
        const response = await fetch(existingSubmission ? `${R3_FORM_API}/${existingSubmission.id}` : R3_FORM_API, {
            method: existingSubmission ? 'PUT' : 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const result = await response.json();
        console.log('Submission successful:', result);
        
        // Clear form cache after successful submission
        clearAllCache();
        
        alert(existingSubmission ? 'Assessment updated successfully!' : 'Assessment submitted successfully!');

        if (confirm('Would you like to clear the form?')) {
            clearForm();
        }

    } catch (error) {
        console.error('Submission error:', error);
        alert(`Error submitting form: ${error.message}`);
    }
}

// Function to handle expandable text auto-resize
function handleExpandableTextResize(textarea) {
    // Set initial height
    textarea.style.height = 'auto';
    
    // Calculate content height
    const contentHeight = textarea.scrollHeight;
    const maxHeight = window.innerHeight * 0.8; // 80% of viewport height
    
    // Set new height, capped at maxHeight
    textarea.style.height = Math.min(contentHeight, maxHeight) + 'px';
    
    // Update modal container height if needed
    const modalContainer = document.querySelector('.modal-container');
    if (modalContainer) {
        const headerHeight = modalContainer.querySelector('.modal-header').offsetHeight;
        const padding = 32; // Account for modal padding
        const newModalHeight = Math.min(contentHeight + headerHeight + padding, maxHeight);
        modalContainer.style.height = newModalHeight + 'px';
    }
}

// Function to initialize expandable fields
function initializeExpandableFields() {
    document.querySelectorAll('.expandable-field').forEach(field => {
        const preview = field.querySelector('.field-preview');
        const fieldId = field.dataset.fieldId;
        
        if (preview) {
            preview.addEventListener('click', () => {
                const modal = document.querySelector('.modal-container');
                const modalHeader = modal.querySelector('.modal-header h4');
                const textarea = modal.querySelector('.expandable-text');
                
                // Set modal color based on field
                modal.dataset.fieldId = fieldId;
                modalHeader.textContent = fieldConfig[fieldId].title;
                textarea.value = window.fieldContents[fieldId] || '';
                textarea.maxLength = fieldConfig[fieldId].charLimit;
                
                // Setup auto-resize
                textarea.addEventListener('input', () => {
                    handleExpandableTextResize(textarea);
                });
                
                // Initial resize
                setTimeout(() => {
                    handleExpandableTextResize(textarea);
                }, 0);
                
                const inputHandler = debounce(() => {
                    window.fieldContents[fieldId] = textarea.value.trim();
                    saveToLocalStorage();
                    preview.textContent = window.fieldContents[fieldId] || fieldConfig[fieldId].defaultText;
                }, 300);
                
                textarea.addEventListener('input', inputHandler);
                modal.classList.add('active');
                document.querySelector('.modal-backdrop').classList.add('active');
                textarea.focus();
            });
        }
    });
}

// Function to initialize referrals
function initializeReferrals() {
    const checkboxes = document.querySelectorAll('.referrals-grid input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const checkedBoxes = document.querySelectorAll('.referrals-grid input[type="checkbox"]:checked');
            window.fieldContents.referrals.checked = Array.from(checkedBoxes).map(cb => cb.value);
            saveToLocalStorage();
        });
    });

    const remarksInput = document.querySelector('input[name="other_referrals"]');
    if (remarksInput) {
        remarksInput.addEventListener('input', debounce(() => {
            window.fieldContents.referrals.remarks = remarksInput.value;
            saveToLocalStorage();
        }, 500));
    }
}

// Function to debounce inputs
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

// Function to setup event listeners
function setupEventListeners() {
    // CHATA ID select
    const chataIdSelect = document.getElementById('chata-id-select');
    if (chataIdSelect) {
        chataIdSelect.addEventListener('change', handleChataIdChange);
    }

    // ASC Status select styling
    const ascSelect = document.querySelector('select[name="asc_status"]');
    if (ascSelect) {
        // Initial state check
        if (ascSelect.value === 'ASC confirmed') {
            ascSelect.classList.add('asc-confirmed');
        }
        
        // Change event listener
        ascSelect.addEventListener('change', (e) => {
            if (e.target.value === 'ASC confirmed') {
                e.target.classList.add('asc-confirmed');
            } else {
                e.target.classList.remove('asc-confirmed');
            }
        });
    }

    // Submit button
    const submitButton = document.querySelector('.submit-button');
    if (submitButton) {
        submitButton.addEventListener('click', handleSubmit);
    }

    // Refresh button
    const refreshButton = document.getElementById('refresh-data');
    if (refreshButton) {
        refreshButton.addEventListener('click', async () => {
            const currentIcon = refreshButton.innerHTML;
            try {
                refreshButton.classList.add('loading');
                await loadAllData(true); // Force refresh all data
                
                // Get current CHATA ID
                const chataIdSelect = document.getElementById('chata-id-select');
                const selectedId = chataIdSelect?.value;
                if (selectedId) {
                    await checkExistingSubmission(selectedId);
                }
                
                showSuccess('Data refreshed successfully!');
            } catch (error) {
                console.error('Error refreshing data:', error);
                showError('Error refreshing data. Please try again.');
                // Restore original icon if error occurs
                refreshButton.innerHTML = currentIcon;
            } finally {
                refreshButton.classList.remove('loading');
            }
        });
    }

    // Initialize expandable fields
    initializeExpandableFields();

    // Initialize referrals section
    initializeReferrals();
}

// Function to setup modal handlers
function setupModalHandlers() {
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

    setupModalResize(modal);
}

// Function to setup modal resize
function setupModalResize(modal) {
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

// Function to show success message
function showSuccess(message) {
    alert(message); // Can be replaced with a more sophisticated notification system
}

// Function to show error message
function showError(message) {
    alert(message); // Can be replaced with a more sophisticated notification system
}

// Initialize the application
async function initializeApp() {
    try {
        // Set initial muted state
        const formContent = document.querySelector('.form-content');
        const pdfContainer = document.querySelector('.pdf-container');
        const buttonGroup = document.querySelector('.button-group');
        
        if (formContent) formContent.classList.add('muted');
        if (pdfContainer) pdfContainer.classList.add('muted');
        if (buttonGroup) buttonGroup.classList.add('muted');

        // Check if we have sufficient cached data
        if (isCacheValid(CACHE_KEYS.CHATA_DATA)) {
            console.log('Using cached data for initial load');
            await loadAllData(false); // Use cache if available
        } else {
            console.log('Insufficient cached data, performing fresh load');
            await loadAllData(true); // Force refresh
        }

        setupEventListeners();
        setupModalHandlers();
        
        // Load any saved form data
        loadSavedData();
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('Failed to initialize application. Please refresh the page.');
    }
}

// Call initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

