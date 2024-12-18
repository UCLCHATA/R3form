// Import text box functionality
import './js/text-boxes.js';

// Sheety API configuration
const SHEETY_API_ID = 'd9da852d0370030da19c227582af6f3a';
const SHEETY_PROJECT = 'chata';
const SHEETY_BASE_URL = `https://api.sheety.co/${SHEETY_API_ID}/${SHEETY_PROJECT}`;
const ALL_URL_API = `${SHEETY_BASE_URL}/allUrl`;
const R3_FORM_API = `${SHEETY_BASE_URL}/r3Form`;
const STORAGE_KEY = 'formR3_textBoxes';

// Apps Script URLs configuration
const APPS_SCRIPT_URLS = {
    template: 'https://script.google.com/macros/s/AKfycbwYyyaje5rAmTXvE3ApMPjp8qwKCBWMFA1WxOoV2s_Dy4FohDb6siAMutybl1A2QTGDIQ/exec',
    analysis: 'https://script.google.com/macros/s/AKfycby2ykbSfpqB5TwkZEFd57TdUJfCpe7SSSz0Ct30tcSo-8l5ButjAbM527luEGvHI7JD/exec',
    report: 'https://script.google.com/macros/s/AKfycby99LABGexgJxnuuBjFJytq8mwy3xqX9_OjUlXsYTNDtpZSzlMBbXwokPt8ZNgYWVE/exec'
};

// Cache configuration
const CACHE_KEYS = {
    CHATA_DATA: 'chataData_cache',
    FORM_DATA: 'submitted_forms_cache',
    PDF_URLS: 'pdf_urls_cache',
    TIMESTAMP: 'cache_timestamp'
};

let chataData = [];

// Initialize storage for text boxes
window.fieldContents = {
    clinical: '',
    strengths: '',
    priority: '',
    support: '',
    referrals: {
        checked: [],
        remarks: ''
    }
};

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
        
        // Load default text for all text areas if they're empty
        document.querySelectorAll('.text-box-container').forEach(container => {
            const textarea = container.querySelector('.text-area');
            const preview = container.querySelector('.field-preview');
            const defaultText = container.dataset.defaultText || '';
            
            // Only set default text if the field is empty
            if (textarea && !textarea.value.trim()) {
                textarea.value = defaultText;
            }
            if (preview && !preview.textContent.trim()) {
                preview.textContent = defaultText;
            }
        });
        
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

// Initialize storage for text boxes
window.textBoxContents = window.textBoxContents || {
    clinical: '',
    strengths: '',
    priority: '',
    support: ''
};

// Function to save text box contents
function saveToLocalStorage() {
    try {
        // Get all text box values
        const textBoxes = {
            clinical: document.querySelector('.text-box-container.clinical .text-area')?.value || '',
            strengths: document.querySelector('.text-box-container.strengths .text-area')?.value || '',
            priority: document.querySelector('.text-box-container.priority .text-area')?.value || '',
            support: document.querySelector('.text-box-container.support .text-area')?.value || ''
        };
        
        // Save to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(textBoxes));
        console.log('Saved text boxes:', textBoxes);
    } catch (e) {
        console.error('Error saving to localStorage:', e);
    }
}

// Function to load saved text box contents
function loadSavedData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const textBoxes = JSON.parse(saved);
            
            // Load each text box
            Object.entries(textBoxes).forEach(([id, value]) => {
                const textarea = document.querySelector(`.text-box-container.${id} .text-area`);
                const preview = document.querySelector(`.text-box-container.${id} .field-preview`);
                
                if (textarea && value) {
                    textarea.value = value;
                }
                if (preview) {
                    preview.textContent = value || preview.dataset.defaultText;
                }
            });
        } catch (e) {
            console.error('Error loading saved data:', e);
        }
    }
}

// Function to setup text box listeners
function setupTextBoxListeners() {
    document.querySelectorAll('.text-box-container').forEach(container => {
        const textarea = container.querySelector('.text-area');
        if (textarea) {
            textarea.addEventListener('input', debounce(() => {
                saveToLocalStorage();
            }, 500));
        }
    });
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

// Function to make Apps Script calls with proper delays
async function makeAppsScriptCall(url, chataId) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const callbackName = 'callback_' + Date.now();
        
        window[callbackName] = function(response) {
            document.head.removeChild(script);
            delete window[callbackName];
            resolve(response);
        };

        // Ensure CHATA ID is properly encoded in the URL
        const encodedChataId = encodeURIComponent(chataId);
        script.src = `${url}?callback=${callbackName}&chataId=${encodedChataId}`;
        console.log(`Making Apps Script call to: ${script.src}`);
        
        script.onerror = () => {
            document.head.removeChild(script);
            delete window[callbackName];
            reject(new Error('Script load failed'));
        };

        document.head.appendChild(script);
    });
}

// Update handleSubmit function to verify data exists before proceeding
async function handleSubmit() {
    try {
        const chataIdSelect = document.getElementById('chata-id-select');
        const selectedChataId = chataIdSelect?.value;
        
        if (!selectedChataId) {
            alert('Please select a CHATA ID');
            return;
        }

        // Get the selected data including the child's name
        const selectedData = chataData.find(item => item.id === selectedChataId);
        if (!selectedData) {
            alert('Selected CHATA ID data not found');
            return;
        }

        // Get form data
        const formData = {
            r3Form: {
                chataId: selectedChataId,
                name: selectedData.name,
                timestamp: new Date().toISOString(),
                asc: document.querySelector('select[name="asc_status"]')?.value,
                adhd: document.querySelector('select[name="adhd_status"]')?.value,
                observations: document.querySelector('.text-box-container.clinical .text-area')?.value || '',
                strengths: document.querySelector('.text-box-container.strengths .text-area')?.value || '',
                supportareas: document.querySelector('.text-box-container.priority .text-area')?.value || '',
                recommendations: document.querySelector('.text-box-container.support .text-area')?.value || '',
                referrals: Array.from(document.querySelectorAll('.referrals-grid input[type="checkbox"]:checked'))
                    .map(cb => cb.value).join(', ')
            }
        };

        // Show progress notification
        const notification = createProgressNotification();
        
        try {
            // 1. Check for existing entry
            updateProgress(notification, 'submission', 'Checking for existing entry...');
            const existingResponse = await fetch(R3_FORM_API);
            const existingData = await existingResponse.json();
            const existingEntry = existingData.r3Form?.find(entry => entry.chataId === selectedChataId);

            let submitMethod = 'POST';
            let submitUrl = R3_FORM_API;

            if (existingEntry) {
                submitMethod = 'PUT';
                submitUrl = `${R3_FORM_API}/${existingEntry.id}`;
                console.log('Updating existing entry:', existingEntry.id);
            }

            // 2. Submit/Update form data
            updateProgress(notification, 'submission', 'Submitting form data...');
            const response = await fetch(submitUrl, {
                method: submitMethod,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Form submission failed');
            }

            // 2. Verify data exists in R3_Form (with retries)
            updateProgress(notification, 'waiting', 'Verifying data submission...');
            let dataVerified = false;
            let attempts = 0;
            const maxAttempts = 6;

            while (!dataVerified && attempts < maxAttempts) {
                try {
                    const verifyResponse = await fetch(R3_FORM_API);
                    const verifyData = await verifyResponse.json();
                    
                    console.log('Verification attempt data:', {
                        attempt: attempts + 1,
                        foundEntries: verifyData.r3Form?.length || 0,
                        searchingFor: selectedChataId
                    });
                    
                    if (verifyData.r3Form && verifyData.r3Form.some(entry => entry.chataId === selectedChataId)) {
                        dataVerified = true;
                        console.log('Data verified in R3_Form sheet:', verifyData.r3Form.find(entry => entry.chataId === selectedChataId));
                        break;
                    }
                } catch (error) {
                    console.warn('Verification attempt failed:', error);
                }
                
                attempts++;
                if (!dataVerified && attempts < maxAttempts) {
                    updateProgress(notification, 'waiting', `Waiting for data sync (attempt ${attempts}/${maxAttempts})...`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }

            if (!dataVerified) {
                throw new Error('Could not verify data in R3_Form sheet after multiple attempts');
            }

            // 3. Make Apps Script calls in sequence with proper CHATA ID
            updateProgress(notification, 'template', 'Preparing template...');
            const templateResult = await makeAppsScriptCall(APPS_SCRIPT_URLS.template, selectedChataId);
            console.log('Template stage result:', templateResult);
            
            updateProgress(notification, 'analysis', 'Analyzing data...');
            const analysisResult = await makeAppsScriptCall(APPS_SCRIPT_URLS.analysis, selectedChataId);
            console.log('Analysis stage result:', analysisResult);
            
            updateProgress(notification, 'report', 'Generating report...');
            const result = await makeAppsScriptCall(APPS_SCRIPT_URLS.report, selectedChataId);
            console.log('Report stage result:', result);

            if (result && result.progress && result.progress.details) {
                const { documentUrl, emailStatus } = result.progress.details;
                
                updateProgress(notification, 'email', 'Process completed', {
                    documentUrl: documentUrl,
                    emailStatus: emailStatus.sent ? 
                        `Email sent to ${emailStatus.recipientEmail}` : 
                        `Email sending failed: ${emailStatus.error}`
                });

                if (documentUrl) {
                    window.open(documentUrl, '_blank');
                }
                
            } else {
                throw new Error('Invalid response format from report generation');
            }

        } catch (error) {
            updateProgress(notification, 'error', `Error: ${error.message}`);
            console.error('Report generation error:', error);
            
            const retryBtn = document.createElement('button');
            retryBtn.textContent = 'Retry';
            retryBtn.onclick = handleSubmit;
            notification.querySelector('.progress-details').appendChild(retryBtn);
        }

    } catch (error) {
        console.error('Form submission error:', error);
        alert(`Error: ${error.message}`);
    }
}

// Update createProgressNotification to include close button and timer
function createProgressNotification() {
    const notification = document.createElement('div');
    notification.className = 'progress-notification';
    notification.innerHTML = `
        <div class="progress-header">
            <span>Report Generation Progress</span>
            <button class="close-btn">&times;</button>
        </div>
        <div class="progress-content">
            <div class="progress-status">Initiating Report Generation</div>
            <div class="progress-stages">
                <span class="stage" data-stage="template">●</span>
                <span class="stage" data-stage="analysis">●</span>
                <span class="stage" data-stage="report">●</span>
                <span class="stage" data-stage="email">●</span>
            </div>
            <div class="progress-details"></div>
            <div class="progress-timer">180</div>
        </div>
    `;

    // Add close button handler
    const closeBtn = notification.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
        notification.remove();
    });

    // Start countdown timer
    let timeLeft = 180;
    const timerElement = notification.querySelector('.progress-timer');
    notification.timer = setInterval(() => {
        timeLeft--;
        if (timeLeft >= 0) {
            timerElement.textContent = timeLeft;
        } else {
            clearInterval(notification.timer);
        }
    }, 1000);

    document.body.appendChild(notification);
    return notification;
}

// Update updateProgress to handle timer
function updateProgress(notification, stage, message, details = {}) {
    console.log(`Progress Update - Stage: ${stage}, Message: ${message}`, details);
    
    const statusEl = notification.querySelector('.progress-status');
    const detailsEl = notification.querySelector('.progress-details');
    statusEl.textContent = message;

    const stages = ['template', 'analysis', 'report', 'email'];
    const currentIndex = stages.indexOf(stage);
    
    stages.forEach((s, index) => {
        const stageEl = notification.querySelector(`[data-stage="${s}"]`);
        if (index < currentIndex) {
            stageEl.className = 'stage completed';
        } else if (index === currentIndex) {
            stageEl.className = 'stage in-progress';
        } else {
            stageEl.className = 'stage pending';
        }
    });

    // Update details section
    if (details.documentUrl) {
        detailsEl.innerHTML += `<div class="detail-item">
            <strong>Google Doc:</strong> 
            <a href="${details.documentUrl}" target="_blank">${details.documentUrl}</a>
        </div>`;
    }
    if (details.emailStatus) {
        detailsEl.innerHTML += `<div class="detail-item">
            <strong>Email Status:</strong> ${details.emailStatus}
            ${details.emailStatus.includes('sent') ? '<br><small>(Word document attached to email)</small>' : ''}
        </div>`;
    }

    // If process is complete, clear the timer
    if (stage === 'email' || stage === 'error') {
        if (notification.timer) {
            clearInterval(notification.timer);
        }
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

// Function to clear form
function clearForm() {
    // Clear CHATA ID selection
    const chataIdSelect = document.getElementById('chata-id-select');
    if (chataIdSelect) chataIdSelect.value = '';

    // Clear status selections
    const ascStatus = document.querySelector('select[name="asc_status"]');
    const adhdStatus = document.querySelector('select[name="adhd_status"]');
    if (ascStatus) {
        ascStatus.value = '';
        ascStatus.classList.remove('asc-confirmed');
    }
    if (adhdStatus) adhdStatus.value = '';

    // Clear all text areas and reset sizes
    document.querySelectorAll('.text-box-container').forEach(container => {
        const textarea = container.querySelector('.text-area');
        const preview = container.querySelector('.field-preview');
        
        if (textarea) {
            textarea.value = '';
            textarea.style.height = '100px'; // Reset to default height
        }
        if (preview) {
            preview.textContent = '';
            preview.style.height = '100px'; // Reset preview height as well
        }
    });

    // Clear referral checkboxes
    document.querySelectorAll('.referrals-grid input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });

    // Clear referral remarks
    const remarksInput = document.querySelector('input[name="other_referrals"]');
    if (remarksInput) remarksInput.value = '';

    // Reset PDF viewers
    resetPdfViewers();

    // Clear storage
    localStorage.removeItem(STORAGE_KEY);

    // Add muted state back
    const formContent = document.querySelector('.form-content');
    const pdfContainer = document.querySelector('.pdf-container');
    const buttonGroup = document.querySelector('.button-group');
    
    if (formContent) formContent.classList.add('muted');
    if (pdfContainer) pdfContainer.classList.add('muted');
    if (buttonGroup) buttonGroup.classList.add('muted');
    
    console.log('Form cleared');
}

// Add clear button functionality
document.addEventListener('DOMContentLoaded', () => {
    const clearButton = document.querySelector('.clear-button');
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all form fields?')) {
                clearForm();
            }
        });
    }
});

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
        setupTextBoxListeners();
        loadSavedData();
        
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('Failed to initialize application. Please refresh the page.');
    }
}

// Call initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Update the submit button text
document.addEventListener('DOMContentLoaded', () => {
    const submitButton = document.querySelector('.submit-button');
    if (submitButton) {
        submitButton.textContent = 'Generate Report';
    }
});

function showErrorDialog(message) {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'error-dialog';
        dialog.innerHTML = `
            <div class="error-content">
                <h3>Error</h3>
                <pre>${message}</pre>
                <div class="error-buttons">
                    <button class="retry-btn">Retry</button>
                    <button class="later-btn">Generate Later</button>
                    <button class="support-btn">Contact Support</button>
                </div>
            </div>
        `;

        dialog.querySelector('.retry-btn').onclick = () => {
            dialog.remove();
            resolve('retry');
        };
        dialog.querySelector('.later-btn').onclick = () => {
            dialog.remove();
            resolve('later');
        };
        dialog.querySelector('.support-btn').onclick = () => {
            dialog.remove();
            resolve('support');
        };

        document.body.appendChild(dialog);
    });
}

// Update the testCORSSetup function
async function testCORSSetup() {
    console.log('Testing JSONP setup for Apps Script endpoints...');
    
    const testChataId = 'TEST_CHATA_ID'; // Use a test CHATA_ID for validation
    
    for (const [stage, url] of Object.entries(APPS_SCRIPT_URLS)) {
        try {
            console.log(`Testing ${stage} endpoint:`, url);
            const data = await jsonp(`${url}?test=true&chataId=${testChataId}`);
            console.log(`✓ ${stage} endpoint setup is correct:`, data);
            
            // Validate response format
            if (!data.hasOwnProperty('success')) {
                console.warn(`${stage} endpoint response missing 'success' property`);
            }
            if (data.progress && data.progress.totalSteps !== 3) {
                console.warn(`${stage} endpoint has incorrect totalSteps (expected 3, got ${data.progress.totalSteps})`);
            }
        } catch (error) {
            console.error(`✗ ${stage} endpoint test failed:`, error);
        }
    }
}

// Add CSS for the timer
const style = document.createElement('style');
style.textContent = `
    .progress-timer {
        font-family: monospace;
        font-size: 14px;
        color: #666;
        text-align: center;
        margin-top: 10px;
        padding: 5px;
        border-top: 1px solid #eee;
    }
`;
document.head.appendChild(style);

