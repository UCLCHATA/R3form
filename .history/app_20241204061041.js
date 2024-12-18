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

