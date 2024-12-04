import { fieldConfig } from './config.js';

// Modal handling
const modal = {
    backdrop: document.querySelector('.modal-backdrop'),
    container: document.querySelector('.modal-container'),
    header: document.querySelector('.modal-header h4'),
    textarea: document.querySelector('.expandable-text'),
    currentFieldId: null,

    open(fieldId, content) {
        this.currentFieldId = fieldId;
        this.header.textContent = fieldConfig[fieldId].title;
        this.textarea.value = content || '';
        this.backdrop.classList.add('active');
        this.container.classList.add('active');
        this.textarea.focus();
    },

    close() {
        this.backdrop.classList.remove('active');
        this.container.classList.remove('active');
        this.currentFieldId = null;
    },

    getContent() {
        return this.textarea.value;
    }
};

// Function to set loading state in dropdown
function setDropdownLoadingState(loading) {
    const dropdown = document.getElementById('chata-id-select');
    if (dropdown) {
        if (loading) {
            dropdown.innerHTML = '<option value="">Loading CHATA IDs...</option>';
            dropdown.disabled = true;
        } else {
            dropdown.disabled = false;
        }
    }
}

// Function to update the dropdown with CHATA data
function updateChataDropdown(chataData) {
    const dropdown = document.getElementById('chata-id-select');
    if (dropdown) {
        if (!chataData || chataData.length === 0) {
            dropdown.innerHTML = '<option value="">No CHATA IDs available</option>';
            return;
        }

        dropdown.innerHTML = '<option value="">Select CHATA ID</option>' +
            chataData
                .filter(item => item.id)
                .map(item => {
                    const displayText = item.name ? 
                        `${item.id} - ${item.name}` : 
                        item.id;
                    return `<option value="${item.id}">${displayText}</option>`;
                })
                .join('');
        console.log('Populated dropdown with', chataData.length, 'options');
    }
}

// Function to update PDF viewers
function updatePdfViewers(selectedData) {
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
            console.log('No PDF URLs available for:', selectedData.id);
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

// Function to update field preview
function updateFieldPreview(fieldId, content) {
    const preview = document.querySelector(`[data-field-id="${fieldId}"] .field-preview`);
    if (preview) {
        preview.textContent = content || fieldConfig[fieldId].defaultText;
    }
}

// Function to clear form
function clearForm() {
    // Reset all expandable fields to their default text
    Object.keys(fieldConfig).forEach(fieldId => {
        updateFieldPreview(fieldId, '');
    });

    // Reset dropdowns
    document.querySelector('select[name="asc_status"]').value = '';
    document.querySelector('select[name="adhd_status"]').value = '';

    // Reset checkboxes
    document.querySelectorAll('.referrals-grid input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });

    // Reset other referrals input
    document.querySelector('.referral-other-input').value = '';

    // Reset PDFs
    updatePdfViewers(null);
}

// Initialize expandable sections
function initializeExpandableSections() {
    document.querySelectorAll('.expandable-section').forEach(section => {
        const input = section.querySelector('.field-input');
        const sectionType = section.dataset.type;
        
        // Handle double-click on section
        section.addEventListener('dblclick', (e) => {
            if (e.target === input) return; // Don't trigger if double-clicking the input
            openModal(sectionType);
        });

        // Handle double-click on input
        input.addEventListener('dblclick', () => {
            openModal(sectionType);
        });

        // Prevent single clicks from triggering section events
        input.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });
}

// Open modal with expanded view
function openModal(sectionType) {
    const modal = document.querySelector('.modal-container');
    const modalHeader = modal.querySelector('.modal-header h4');
    const textarea = modal.querySelector('.expandable-text');
    const section = document.querySelector(`.expandable-section[data-type="${sectionType}"]`);
    const input = section.querySelector('.field-input');
    
    // Set modal properties
    modal.dataset.type = sectionType;
    modalHeader.textContent = section.querySelector('h4').textContent;
    textarea.value = input.value;
    
    // Show modal
    modal.classList.add('active');
    document.querySelector('.modal-backdrop').classList.add('active');
    textarea.focus();
    
    // Handle text changes
    textarea.oninput = () => {
        input.value = textarea.value;
        handleAutoResize(input);
    };
}

// Handle textarea auto-resize
function handleAutoResize(textarea) {
    textarea.style.height = 'auto';
    const maxHeight = window.innerHeight * 0.8;
    textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    initializeExpandableSections();
    
    // Handle modal close
    document.querySelector('.modal-backdrop').addEventListener('click', () => {
        document.querySelector('.modal-container').classList.remove('active');
        document.querySelector('.modal-backdrop').classList.remove('active');
    });
});

export {
    modal,
    setDropdownLoadingState,
    updateChataDropdown,
    updatePdfViewers,
    updateFieldPreview,
    clearForm
}; 