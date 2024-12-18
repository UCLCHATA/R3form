import { loadChataData, submitFormData } from './api.js';
import { modal, setDropdownLoadingState, updateChataDropdown, updatePdfViewers, updateFieldPreview, clearForm } from './ui.js';
import { fieldConfig, STORAGE_KEY } from './config.js';

// Initialize field contents
window.fieldContents = window.fieldContents || {
    referrals: {
        checked: [],
        remarks: ''
    }
};

// Event Handlers
async function handleChataIdChange(event) {
    const selectedId = event.target.value;
    const chataData = await loadChataData();
    const selectedData = chataData.find(item => item.id === selectedId);
    updatePdfViewers(selectedData);
}

function handleExpandableFieldClick(event) {
    const field = event.currentTarget;
    const fieldId = field.dataset.fieldId;
    const preview = field.querySelector('.field-preview');
    const currentContent = preview.textContent;
    
    modal.open(fieldId, currentContent);
}

function handleModalClose() {
    if (modal.currentFieldId) {
        const content = modal.getContent();
        updateFieldPreview(modal.currentFieldId, content);
    }
    modal.close();
}

function handleReferralChange() {
    const checkedBoxes = document.querySelectorAll('.referrals-grid input[type="checkbox"]:checked');
    const otherInput = document.querySelector('.referral-other-input');
    
    window.fieldContents.referrals.checked = Array.from(checkedBoxes).map(cb => cb.value);
    window.fieldContents.referrals.remarks = otherInput.value;
}

async function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = document.getElementById('assessment-form');
    const formData = {
        chataId: document.getElementById('chata-id-select').value,
        ascStatus: form.querySelector('select[name="asc_status"]').value,
        adhdStatus: form.querySelector('select[name="adhd_status"]').value,
        clinicalObservations: document.querySelector('[data-field-id="clinical-observations"] .field-preview').textContent,
        strengthsAbilities: document.querySelector('[data-field-id="strengths-abilities"] .field-preview').textContent,
        prioritySupport: document.querySelector('[data-field-id="priority-support"] .field-preview').textContent,
        supportRecommendations: document.querySelector('[data-field-id="support-recommendations"] .field-preview').textContent,
        referrals: window.fieldContents.referrals.checked.join(', '),
        otherReferrals: window.fieldContents.referrals.remarks
    };

    try {
        const result = await submitFormData(formData);
        console.log('Form submitted successfully:', result);
        alert('Form submitted successfully!');
        clearForm();
    } catch (error) {
        console.error('Error submitting form:', error);
        alert('Error submitting form. Please try again.');
    }
}

// Initialize expandable fields
function initializeExpandableFields() {
    // Create single backdrop if it doesn't exist
    let backdrop = document.querySelector('.backdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'backdrop';
        document.body.appendChild(backdrop);
    }

    document.querySelectorAll('.expandable-section').forEach(section => {
        const textarea = section.querySelector('.field-preview');
        const fieldId = section.dataset.fieldId;
        
        // Set initial reference text if empty
        if (!textarea.value && fieldConfig[fieldId]) {
            textarea.value = fieldConfig[fieldId].defaultText;
        }

        // Handle double-click expansion
        section.addEventListener('dblclick', (e) => {
            if (e.target === textarea) return; // Don't trigger on textarea double-click
            
            // Toggle expanded state
            textarea.classList.toggle('expanded');
            backdrop.classList.toggle('active');
            
            if (textarea.classList.contains('expanded')) {
                textarea.style.height = '80vh';
                textarea.focus();
            } else {
                textarea.style.height = textarea.scrollHeight + 'px';
            }
        });

        // Handle backdrop click to close
        backdrop.addEventListener('click', () => {
            const expandedTextarea = document.querySelector('.field-preview.expanded');
            if (expandedTextarea) {
                expandedTextarea.classList.remove('expanded');
                backdrop.classList.remove('active');
                expandedTextarea.style.height = expandedTextarea.scrollHeight + 'px';
            }
        });

        // Handle escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const expandedTextarea = document.querySelector('.field-preview.expanded');
                if (expandedTextarea) {
                    expandedTextarea.classList.remove('expanded');
                    backdrop.classList.remove('active');
                    expandedTextarea.style.height = expandedTextarea.scrollHeight + 'px';
                }
            }
        });

        // Handle input and auto-resize
        textarea.addEventListener('input', () => {
            if (!textarea.classList.contains('expanded')) {
                textarea.style.height = 'auto';
                const newHeight = Math.min(textarea.scrollHeight, window.innerHeight * 0.8);
                textarea.style.height = newHeight + 'px';
            }
            
            // Save content
            window.fieldContents[fieldId] = textarea.value;
            saveToLocalStorage();
        });
    });
}

// Initialize form
async function initializeForm() {
    try {
        setDropdownLoadingState(true);
        const chataData = await loadChataData();
        updateChataDropdown(chataData);
    } catch (error) {
        console.error('Error initializing form:', error);
        alert('Error loading CHATA data. Please try again.');
    } finally {
        setDropdownLoadingState(false);
    }

    // Initialize expandable fields
    initializeExpandableFields();

    // Add event listeners
    document.getElementById('chata-id-select').addEventListener('change', handleChataIdChange);
    document.querySelectorAll('.expandable-section').forEach(section => {
        section.addEventListener('click', handleExpandableFieldClick);
    });
    document.querySelector('.modal-backdrop').addEventListener('click', handleModalClose);
    document.querySelector('.modal-container').addEventListener('click', e => e.stopPropagation());
    document.querySelectorAll('.referrals-grid input[type="checkbox"], .referral-other-input').forEach(input => {
        input.addEventListener('change', handleReferralChange);
    });
    document.getElementById('assessment-form').addEventListener('submit', handleFormSubmit);
    document.querySelector('.clear-button').addEventListener('click', clearForm);

    // Load saved content from localStorage
    loadFromLocalStorage();
}

// Storage functions
function saveToLocalStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(window.fieldContents));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function loadFromLocalStorage() {
    try {
        const savedContent = localStorage.getItem(STORAGE_KEY);
        if (savedContent) {
            window.fieldContents = JSON.parse(savedContent);
            
            // Restore field contents
            Object.keys(window.fieldContents).forEach(fieldId => {
                if (fieldId === 'referrals') {
                    // Restore referral checkboxes
                    window.fieldContents.referrals.checked.forEach(value => {
                        const checkbox = document.querySelector(`.referrals-grid input[value="${value}"]`);
                        if (checkbox) checkbox.checked = true;
                    });
                    // Restore other referrals input
                    const otherInput = document.querySelector('.referral-other-input');
                    if (otherInput) otherInput.value = window.fieldContents.referrals.remarks;
                } else {
                    // Restore expandable field content
                    const preview = document.querySelector(`[data-field-id="${fieldId}"] .field-preview`);
                    if (preview) preview.textContent = window.fieldContents[fieldId];
                }
            });
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
    }
}

// Initialize the form when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeForm);

