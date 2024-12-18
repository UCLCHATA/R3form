class TextBox {
    static activeInstance = null; // Track which instance owns the modal
    
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            defaultText: '',
            maxHeight: '80vh',
            ...options
        };
        this.bulletPoint = '• ';
        
        this.init();
    }
    
    init() {
        // Create text area
        this.textArea = this.container.querySelector('.text-area');
        this.modal = document.querySelector('.text-box-modal');
        this.modalTextArea = this.modal.querySelector('.modal-textarea');
        
        // Initialize resize handle
        this.initResizeHandle();
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Set default text if provided
        if (this.options.defaultText) {
            this.textArea.value = this.options.defaultText;
        }

        // Ensure initial bullet point if empty
        if (!this.textArea.value) {
            this.textArea.value = this.bulletPoint;
        }
    }
    
    initResizeHandle() {
        const handle = document.createElement('div');
        handle.className = 'resize-handle';
        handle.innerHTML = '<i class="material-icons">drag_handle</i>';
        this.container.querySelector('.text-box-content').appendChild(handle);
        
        let startY, startHeight;
        
        const startResize = (e) => {
            startY = e.clientY;
            startHeight = parseInt(getComputedStyle(this.textArea).height);
            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', stopResize);
        };
        
        const resize = (e) => {
            const delta = e.clientY - startY;
            const newHeight = Math.min(
                Math.max(startHeight + delta, 82),
                window.innerHeight * 0.8
            );
            this.textArea.style.height = `${newHeight}px`;
        };
        
        const stopResize = () => {
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
        };
        
        handle.addEventListener('mousedown', startResize);
    }
    
    initEventListeners() {
        // Container click for focus
        this.container.addEventListener('click', (e) => {
            if (e.target !== this.textArea) {
                this.textArea.focus();
            }
        });
        
        // Double click for modal
        this.container.addEventListener('dblclick', () => this.openModal());
        
        // Text area focus/blur events
        this.textArea.addEventListener('focus', () => {
            this.container.classList.add('active');
        });
        
        this.textArea.addEventListener('blur', () => {
            if (!this.modal.classList.contains('active')) {
                this.container.classList.remove('active');
            }
        });
        
        // Sync text between textarea and modal
        this.textArea.addEventListener('input', () => {
            if (TextBox.activeInstance === this && this.modal.classList.contains('active')) {
                this.modalTextArea.value = this.textArea.value;
            }
        });
        
        this.modalTextArea.addEventListener('input', () => {
            if (TextBox.activeInstance === this) {
                this.textArea.value = this.modalTextArea.value;
            }
        });

        // Add bullet point functionality
        this.textArea.addEventListener('keydown', this.handleKeyDown.bind(this));
        this.modalTextArea.addEventListener('keydown', this.handleKeyDown.bind(this));
        this.textArea.addEventListener('paste', this.handlePaste.bind(this));
        this.modalTextArea.addEventListener('paste', this.handlePaste.bind(this));
        
        // Modal controls
        this.modal.querySelector('.modal-close').addEventListener('click', () => {
            if (TextBox.activeInstance === this) {
                this.closeModal();
            }
        });
        
        this.modal.querySelector('.modal-save').addEventListener('click', () => {
            if (TextBox.activeInstance === this) {
                this.saveAndClose();
            }
        });
        
        // Add escape key listener for modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && TextBox.activeInstance === this && this.modal.classList.contains('active')) {
                this.closeModal();
            }
        });
    }

    handleKeyDown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            
            const textarea = event.target;
            const cursorPosition = textarea.selectionStart;
            const currentContent = textarea.value;
            
            // Get the current line
            const beforeCursor = currentContent.substring(0, cursorPosition);
            const afterCursor = currentContent.substring(cursorPosition);
            const currentLine = beforeCursor.split('\n').pop();
            
            // Check if current line is empty (just a bullet point)
            if (currentLine.trim() === this.bulletPoint.trim()) {
                // Remove the bullet point from the empty line
                const lastNewLine = beforeCursor.lastIndexOf('\n');
                const newContent = currentContent.substring(0, lastNewLine) + afterCursor;
                textarea.value = newContent;
                textarea.selectionStart = textarea.selectionEnd = lastNewLine === -1 ? 0 : lastNewLine;
            } else {
                // Add new line with bullet point
                const newContent = beforeCursor + '\n' + this.bulletPoint + afterCursor;
                textarea.value = newContent;
                textarea.selectionStart = textarea.selectionEnd = cursorPosition + this.bulletPoint.length + 1;
            }
            
            // Sync between textareas if in modal
            if (textarea === this.modalTextArea && TextBox.activeInstance === this) {
                this.textArea.value = textarea.value;
            } else if (textarea === this.textArea && TextBox.activeInstance === this) {
                this.modalTextArea.value = textarea.value;
            }
        }
    }

    handlePaste(event) {
        // Only process paste if this is the active instance
        if (event.target === this.modalTextArea && TextBox.activeInstance !== this) {
            return;
        }
        
        event.preventDefault();
        
        const textarea = event.target;
        const cursorPosition = textarea.selectionStart;
        const currentContent = textarea.value;
        
        // Get pasted content
        let pastedContent = (event.clipboardData || window.clipboardData).getData('text');
        
        // Process pasted content: add bullet points to each line if needed
        pastedContent = pastedContent.split('\n').map(line => {
            line = line.trim();
            if (line && !line.startsWith(this.bulletPoint)) {
                return this.bulletPoint + line;
            }
            return line;
        }).join('\n');
        
        // Insert the processed content
        const beforeCursor = currentContent.substring(0, cursorPosition);
        const afterCursor = currentContent.substring(cursorPosition);
        const newContent = beforeCursor + pastedContent + afterCursor;
        
        textarea.value = newContent;
        textarea.selectionStart = textarea.selectionEnd = cursorPosition + pastedContent.length;
        
        // Sync between textareas if in modal
        if (textarea === this.modalTextArea && TextBox.activeInstance === this) {
            this.textArea.value = textarea.value;
        } else if (textarea === this.textArea && TextBox.activeInstance === this) {
            this.modalTextArea.value = textarea.value;
        }
    }
    
    openModal() {
        // Close any other open modals first
        if (TextBox.activeInstance && TextBox.activeInstance !== this) {
            TextBox.activeInstance.closeModal();
        }
        
        TextBox.activeInstance = this;
        this.modalTextArea.value = this.textArea.value;
        
        // Get the type from the container's class
        const type = this.container.classList.contains('clinical') ? 'clinical' :
                     this.container.classList.contains('strengths') ? 'strengths' :
                     this.container.classList.contains('priority') ? 'priority' :
                     this.container.classList.contains('support') ? 'support' : '';
        
        // Set the type on the modal
        this.modal.dataset.type = type;
        
        this.modal.classList.add('active');
        this.container.classList.add('active');
        this.modalTextArea.focus();
        
        // Update modal header
        const header = this.container.querySelector('.text-box-header').cloneNode(true);
        this.modal.querySelector('.modal-header').prepend(header);
    }
    
    closeModal() {
        if (TextBox.activeInstance === this) {
            this.modal.classList.remove('active');
            this.container.classList.remove('active');
            TextBox.activeInstance = null;
            
            // Remove cloned header
            const header = this.modal.querySelector('.text-box-header');
            if (header) header.remove();
        }
    }
    
    saveAndClose() {
        if (TextBox.activeInstance === this) {
            this.textArea.value = this.modalTextArea.value;
            this.closeModal();
        }
    }
    
    getValue() {
        return this.textArea.value;
    }
    
    setValue(value) {
        // Ensure value starts with bullet point if not empty
        if (value && !value.startsWith(this.bulletPoint)) {
            value = this.bulletPoint + value;
        }
        
        this.textArea.value = value || this.bulletPoint;
        if (TextBox.activeInstance === this && this.modal.classList.contains('active')) {
            this.modalTextArea.value = this.textArea.value;
        }
    }
}

// Initialize text boxes
document.addEventListener('DOMContentLoaded', () => {
    const containers = document.querySelectorAll('.text-box-container');
    containers.forEach(container => {
        new TextBox(container, {
            defaultText: container.dataset.defaultText || ''
        });
    });
}); 