function clearForm() {
    // Reset CHATA ID dropdown
    const chataIdSelect = document.getElementById('chata-id-select');
    if (chataIdSelect) {
        chataIdSelect.value = '';
    }

    // Reset status dropdowns
    const ascStatus = document.querySelector('select[name="asc_status"]');
    const adhdStatus = document.querySelector('select[name="adhd_status"]');
    if (ascStatus) ascStatus.value = '';
    if (adhdStatus) adhdStatus.value = '';

    // Reset all expandable fields to their default text
    Object.keys(fieldConfig).forEach(fieldId => {
        const preview = document.querySelector(`[data-field-id="${fieldId}"] .field-preview`);
        if (preview) {
            preview.textContent = fieldConfig[fieldId].defaultText;
            // Also clear the stored content
            window.fieldContents[fieldId] = '';
        }
    });

    // Reset referrals
    const checkboxes = document.querySelectorAll('.referrals-grid input[type="checkbox"]');
    checkboxes.forEach(checkbox => checkbox.checked = false);

    // Reset other referrals input
    const otherInput = document.querySelector('.referral-other-input');
    if (otherInput) otherInput.value = '';

    // Clear referrals from window.fieldContents
    window.fieldContents.referrals = {
        checked: [],
        remarks: ''
    };

    // Reset PDF viewers
    resetPdfViewers();

    // Clear any warnings
    removeWarnings();

    // Clear local storage
    localStorage.removeItem(STORAGE_KEY);

    // Save the cleared state
    saveToLocalStorage();
}

