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
    CACHE_TIMESTAMP: 'chataData_timestamp',
    CACHE_DURATION: 1000 * 60 * 5  // 5 minutes cache for development
};

let chataData = [];
let pdfUrls = [];

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

// Function to load CHATA data with caching
async function loadChataData(forceRefresh = false) {
    try {
        // Check cache first unless force refresh is requested
        if (!forceRefresh && isCacheValid()) {
            const cachedData = getCachedData();
            if (cachedData && cachedData.length > 0) {
                console.log('Loading data from cache (expires in:', 
                    Math.round((CACHE_KEYS.CACHE_DURATION - (new Date().getTime() - parseInt(localStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP)))) / 1000), 
                    'seconds)');
                chataData = cachedData;
                return chataData;
            }
        }

        console.log('Fetching fresh data from API:', ALL_URL_API);
        
        const response = await fetch(ALL_URL_API);
        if (!response.ok) {
            throw new Error('Failed to fetch CHATA data');
        }

        const json = await response.json();
        console.log('Raw CHATA data:', json);
        
        if (!json || !json.allUrl) {
            throw new Error('Invalid data format received from API');
        }

        chataData = json.allUrl
            .filter(row => row.chataId && row.chataId !== "CHATA_ID")
            .map(row => ({
                id: row.chataId,
                name: row.childName,
                r1Url: row['r1Generated (pdf)'],
                r2Url: row['r2Generated (pdf)']
            }));

        console.log('Processed CHATA data:', chataData);
        
        if (chataData.length === 0) {
            throw new Error('No valid data received from API');
        }

        setCacheData(chataData);
        
        const dropdown = document.getElementById('chata-id-select');
        if (dropdown && chataData.length > 0) {
            dropdown.innerHTML = '<option value="">Select CHATA ID</option>' +
                chataData.map(item => `<option value="${item.id}">${item.id} - ${item.name}</option>`).join('');
            console.log('Populated dropdown with options:', dropdown.innerHTML);
        } else {
            console.error('Dropdown issues:', {
                dropdownExists: !!dropdown,
                dataLength: chataData.length
            });
        }

        return chataData;

    } catch (error) {
        console.error('Error loading CHATA data:', error);
        const cachedData = getCachedData();
        if (cachedData && cachedData.length > 0) {
            console.log('Using cached data as fallback');
            chataData = cachedData;
            return chataData;
        }
        throw error;
    }
}

function handleChataIdChange(event) {
    const selectedId = event.target.value;
    const selectedData = chataData.find(item => item.id === selectedId);
    
    if (selectedData) {
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
    } else {
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
            if (placeholder) {
                placeholder.style.display = 'block';
            }
        });
    }
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

// Initialize window.fieldContents with a new section for referrals
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
    // Load both CHATA data and PDF URLs in parallel
    await Promise.all([
        loadChataData(),
        fetchPdfUrls()
    ]);

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

    // Initialize expandable fields
    const expandableFields = document.querySelectorAll('.expandable-field');
    
    expandableFields.forEach(field => {
        const preview = field.querySelector('.field-preview');
        
        // Click handler for expansion
        preview.addEventListener('click', function(e) {
            // Toggle expanded state
            const isExpanded = this.getAttribute('data-expanded') === 'true';
            this.setAttribute('data-expanded', !isExpanded);
            
            // Update styles
            if (!isExpanded) {
                this.style.minHeight = '240px';
                field.classList.add('expanded');
            } else {
                this.style.minHeight = '120px';
                field.classList.remove('expanded');
            }
            
            // Prevent immediate blur when clicking to expand
            if (!isExpanded) {
                e.preventDefault();
                this.focus();
            }
        });
        
        // Handle focus
        preview.addEventListener('focus', function() {
            this.setAttribute('data-expanded', 'true');
            this.style.minHeight = '240px';
            field.classList.add('expanded');
        });
        
        // Optional: Handle blur only if user clicks outside
        preview.addEventListener('blur', function(e) {
            // Only collapse if there's no text and user clicked outside
            if (this.textContent.trim() === '') {
                this.setAttribute('data-expanded', 'false');
                this.style.minHeight = '120px';
                field.classList.remove('expanded');
            }
        });
    });
});

// Initialize modal functionality
function initializeModal() {
    const modal = document.querySelector('.modal-container');
    const backdrop = document.querySelector('.modal-backdrop');
    const modalContent = modal.querySelector('.modal-content');

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
    document.querySelectorAll('.section.expandable-section').forEach(section => {
        const preview = section.querySelector('.field-preview');
        const fieldId = section.querySelector('.expandable-field').dataset.fieldId;
        
        // Load saved content if any
        if (window.fieldContents[fieldId]) {
            preview.value = window.fieldContents[fieldId];
        }
        
        // Save content on input
        preview.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            window.fieldContents[fieldId] = value;
            saveToLocalStorage();
        });

        // Double click on entire section to open modal
        section.addEventListener('dblclick', (e) => {
            e.preventDefault();
            openFieldEditor(fieldId, preview.value);
        });

        // Prevent double click on textarea from triggering twice
        preview.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            openFieldEditor(fieldId, preview.value);
        });

        // Ensure proper height on load
        adjustTextareaHeight(preview);
    });
}

// Adjust textarea height based on content
function adjustTextareaHeight(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(82, textarea.scrollHeight) + 'px';
}

// Update preview content
function updatePreviewContent(fieldId, value) {
    const preview = document.querySelector(`[data-field-id="${fieldId}"] .field-preview`);
    if (preview) {
        preview.value = value || fieldConfig[fieldId].defaultText;
        adjustTextareaHeight(preview);
        // Trigger input event to ensure content is saved
        preview.dispatchEvent(new Event('input'));
    }
}

// Icon mapping for each field
const fieldIcons = {
    'clinical-observations': 'visibility',
    'strengths-abilities': 'stars',
    'priority-support': 'priority_high',
    'support-recommendations': 'lightbulb'
};

// Open field editor for full-screen editing
function openFieldEditor(fieldId, currentContent) {
    const modal = document.querySelector('.modal-container');
    const backdrop = document.querySelector('.modal-backdrop');
    const modalHeader = modal.querySelector('.modal-header h4');
    const modalIcon = modal.querySelector('.modal-header i');
    const textarea = modal.querySelector('.expandable-text');
    
    modalHeader.textContent = fieldConfig[fieldId].title;
    modalIcon.textContent = fieldIcons[fieldId];
    modal.dataset.fieldId = fieldId;
    
    textarea.value = currentContent;
    textarea.maxLength = fieldConfig[fieldId].charLimit;

    const inputHandler = debounce(() => {
        const value = textarea.value.trim();
        updatePreviewContent(fieldId, value);
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

// Add debounce function if not already present
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

        // Get ASC and ADHD status first
        const ascStatus = document.querySelector('select[name="asc_status"]')?.value;
        const adhdStatus = document.querySelector('select[name="adhd_status"]')?.value;

        if (!ascStatus || !adhdStatus) {
            alert('Please select both ASC and ADHD status');
            return;
        }

        // First get all existing entries
        const allEntriesResponse = await fetch(`${FORM_RESPONSES_API}?sheet=Form_Responses`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!allEntriesResponse.ok) {
            throw new Error('Failed to check existing entries');
        }

        const allEntries = await allEntriesResponse.json();
        console.log('All existing entries:', allEntries);

        // Check if this CHATA_ID already exists
        const existingEntry = allEntries.find(entry => entry.CHATA_ID === selectedChataId);
        console.log('Found existing entry:', existingEntry);

        // Get referrals data
        const professionalReferrals = window.fieldContents.referrals ? 
            `Selected referrals: ${window.fieldContents.referrals.checked.join(', ')}${window.fieldContents.referrals.remarks ? `\nRemarks: ${window.fieldContents.referrals.remarks}` : ''}` :
            'No referrals selected';

        // Prepare the data object with explicit column ordering
        const formData = {
            "A": selectedChataId, // CHATA_ID
            "B": selectedData.name, // Name
            "C": new Date().toISOString(), // Timestamp
            "D": ascStatus, // ASC_Status
            "E": adhdStatus, // ADHD_Status
            "F": window.fieldContents['clinical-observations'] || '', // Key_Clinical_Observations
            "G": window.fieldContents['strengths-abilities'] || '', // Strengths_and_Abilities
            "H": window.fieldContents['priority-support'] || '', // Priority_Support_Areas
            "I": window.fieldContents['support-recommendations'] || '', // Support_Recommendations
            "J": professionalReferrals // Professional_Referrals
        };

        if (existingEntry) {
            const userChoice = confirm(
                `An assessment for ${selectedChataId} already exists.\n\n` +
                'Click OK to update the existing assessment, or Cancel to abort submission.'
            );
            
            if (!userChoice) {
                return; // User chose to cancel
            }

            // Delete existing entry using CHATA_ID
            const deleteUrl = `${FORM_RESPONSES_API}/CHATA_ID/${selectedChataId}?sheet=Form_Responses`;
            console.log('Delete URL:', deleteUrl);

            const deleteResponse = await fetch(deleteUrl, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!deleteResponse.ok) {
                const errorText = await deleteResponse.text();
                console.error('Delete response:', errorText);
                throw new Error(`Failed to remove existing entries. Status: ${deleteResponse.status}, Details: ${errorText}`);
            }

            const deleteResult = await deleteResponse.json();
            console.log('Delete result:', deleteResult);

            // Wait a moment to ensure deletion is processed
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Now create the new entry with explicit column mapping
            const createResponse = await fetch(`${FORM_RESPONSES_API}?sheet=Form_Responses`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: [{
                        "CHATA_ID": formData.A,
                        "Name": formData.B,
                        "Timestamp": formData.C,
                        "ASC_Status": formData.D,
                        "ADHD_Status": formData.E,
                        "Key_Clinical_Observations": formData.F,
                        "Strengths_and_Abilities": formData.G,
                        "Priority_Support_Areas": formData.H,
                        "Support_Recommendations": formData.I,
                        "Professional_Referrals": formData.J
                    }]
                })
            });

            if (!createResponse.ok) {
                const errorText = await createResponse.text();
                console.error('Create response:', errorText);
                throw new Error(`Failed to create new entry. Status: ${createResponse.status}, Details: ${errorText}`);
            }

            const createResult = await createResponse.json();
            console.log('Create result:', createResult);
        } else {
            // Create new entry with explicit column mapping
            const response = await fetch(`${FORM_RESPONSES_API}?sheet=Form_Responses`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: [{
                        "CHATA_ID": formData.A,
                        "Name": formData.B,
                        "Timestamp": formData.C,
                        "ASC_Status": formData.D,
                        "ADHD_Status": formData.E,
                        "Key_Clinical_Observations": formData.F,
                        "Strengths_and_Abilities": formData.G,
                        "Priority_Support_Areas": formData.H,
                        "Support_Recommendations": formData.I,
                        "Professional_Referrals": formData.J
                    }]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
            }

            const result = await response.json();
            console.log('Create result:', result);
        }

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
            // Trigger change event to reset PDFs
            chataIdSelect.dispatchEvent(new Event('change'));
        }
        
        const nameDisplay = document.getElementById('chata-name-display');
        if (nameDisplay) {
            nameDisplay.textContent = '';
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
    // Add listeners to checkboxes
    const checkboxes = document.querySelectorAll('.referrals-grid input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', saveReferrals);
    });

    // Add listener to remarks input
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

