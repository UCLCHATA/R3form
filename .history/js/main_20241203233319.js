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

// Initialize the application
async function initializeApp() {
    try {
        // Set up event listeners
        document.getElementById('chata-id-select').addEventListener('change', handleChataIdChange);
        
        document.querySelectorAll('.expandable-field').forEach(field => {
            field.addEventListener('click', handleExpandableFieldClick);
        });
        
        document.querySelector('.modal-backdrop').addEventListener('click', handleModalClose);
        
        document.querySelectorAll('.referrals-grid input').forEach(input => {
            input.addEventListener('change', handleReferralChange);
        });
        
        document.querySelector('.submit-button').addEventListener('click', handleFormSubmit);
        
        // Initialize expandable fields with default text
        Object.keys(fieldConfig).forEach(fieldId => {
            updateFieldPreview(fieldId, '');
        });

        // Load initial data
        setDropdownLoadingState(true);
        const initialData = await loadChataData();
        updateChataDropdown(initialData);
    } catch (error) {
        console.error('Error initializing app:', error);
        alert('Error loading application data. Please refresh the page.');
    } finally {
        setDropdownLoadingState(false);
    }
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp); 