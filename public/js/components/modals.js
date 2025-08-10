// =====================================================
// FILE: /public/js/components/modals.js
// =====================================================

// Modal Management Component
const ModalsComponent = {
    init() {
        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                this.closeAllModals();
            }
        });

        // Close modals with ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    },

    closeAllModals() {
        const modals = document.querySelectorAll('[id$="Modal"]');
        modals.forEach(modal => {
            if (modal && !modal.classList.contains('hidden')) {
                modal.classList.add('hidden');
            }
        });
    }
};

// Initialize modals component
window.ModalsComponent = ModalsComponent;