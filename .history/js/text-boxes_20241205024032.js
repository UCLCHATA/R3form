class TextBox {
    static activeInstance = null; // Track which instance owns the modal
    
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            defaultText: '',
            maxHeight: '80vh',
            ...options
        };
        
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
    
    openModal() {
        // Close any other open modals first
        if (TextBox.activeInstance && TextBox.activeInstance !== this) {
            TextBox.activeInstance.closeModal();
        }
        
        TextBox.activeInstance = this;
        this.modalTextArea.value = this.textArea.value;
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
        this.textArea.value = value;
        if (TextBox.activeInstance === this && this.modal.classList.contains('active')) {
            this.modalTextArea.value = value;
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