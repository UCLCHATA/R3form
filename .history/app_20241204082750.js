function initializeExpandableFields() {
    const fields = document.querySelectorAll('.expandable-section');
    fields.forEach(field => {
        const preview = field.querySelector('.field-preview');
        const fieldId = field.dataset.fieldId;
        
        // Create unique modal for this field
        const modal = createModalForField(fieldId);
        const textarea = modal.querySelector('.expandable-text');
        const backdrop = document.querySelector('.modal-backdrop');
        
        // Set initial height based on content
        if (preview) {
            preview.style.height = 'auto';
            const defaultHeight = Math.max(100, preview.scrollHeight);
            preview.style.height = defaultHeight + 'px';
            preview.dataset.defaultHeight = defaultHeight;

            // Initialize field content
            if (!window.fieldContents[fieldId]) {
                window.fieldContents[fieldId] = fieldConfig[fieldId].defaultText;
            }
            preview.textContent = window.fieldContents[fieldId];

            // Handle double-click to open modal
            field.addEventListener('dblclick', () => {
                const fieldBorderColor = window.getComputedStyle(field).borderColor;
                modal.style.borderColor = fieldBorderColor;
                modal.querySelector('.modal-header').style.borderBottomColor = fieldBorderColor;

                // Set modal content
                textarea.value = window.fieldContents[fieldId];
                
                // Show modal
                modal.classList.add('active');
                backdrop.classList.add('active');
                textarea.focus();
            });

            // Handle input in modal
            textarea.addEventListener('input', debounce(() => {
                const content = textarea.value.trim();
                window.fieldContents[fieldId] = content;
                preview.textContent = content || fieldConfig[fieldId].defaultText;
                saveToLocalStorage();
            }, 300));

            // Handle save and close button
            modal.querySelector('.save-close-btn').addEventListener('click', () => {
                saveAndCloseModal(modal, fieldId, textarea, preview);
            });

            // Handle backdrop click
            backdrop.addEventListener('click', () => {
                // Only close if this modal is active
                if (modal.classList.contains('active')) {
                    saveAndCloseModal(modal, fieldId, textarea, preview);
                }
            });

            // Handle escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.classList.contains('active')) {
                    saveAndCloseModal(modal, fieldId, textarea, preview);
                }
            });
        }
    });
} 