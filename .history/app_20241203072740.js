// Replace with your Google Apps Script Web App URL
const SCRIPT_URL = 'YOUR_SCRIPT_URL_HERE';

async function loadChataData() {
    try {
        const response = await fetch(`${SCRIPT_URL}?type=chataIds`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch CHATA data');
        }

        const result = await response.json();
        if (result.result === 'success') {
            console.log('Raw CHATA data:', result.data);
            
            // Map the data to the format we need
            chataData = result.data;
            console.log('Processed CHATA data:', chataData);
            
            const dropdown = document.getElementById('chata-id-select');
            if (dropdown && chataData.length > 0) {
                dropdown.innerHTML = '<option value="">Select CHATA ID</option>' +
                    chataData.map(item => `<option value="${item.id}">${item.id}</option>`).join('');
                console.log('Populated dropdown with options:', dropdown.innerHTML);
            } else {
                console.error('Dropdown issues:', {
                    dropdownExists: !!dropdown,
                    dataLength: chataData.length
                });
            }
        } else {
            throw new Error('Failed to get data: ' + result.error);
        }
    } catch (error) {
        console.error('Error loading CHATA data:', error);
    }
}

async function handleSubmit() {
    try {
        const chataIdSelect = document.getElementById('chata-id-select');
        const selectedChataId = chataIdSelect?.value;
        const selectedData = chataData.find(item => item.id === selectedChataId);
        
        if (!selectedChataId || !selectedData) {
            alert('Please select a CHATA ID');
            return;
        }

        const ascStatus = document.querySelector('select[name="asc_status"]')?.value;
        const adhdStatus = document.querySelector('select[name="adhd_status"]')?.value;

        if (!ascStatus || !adhdStatus) {
            alert('Please select both ASC and ADHD status');
            return;
        }

        // Get referrals data
        const professionalReferrals = window.fieldContents.referrals ? 
            `Selected referrals: ${window.fieldContents.referrals.checked.join(', ')}${window.fieldContents.referrals.remarks ? `\nRemarks: ${window.fieldContents.referrals.remarks}` : ''}` :
            'No referrals selected';

        // Create FormData object
        const formData = new FormData();
        formData.append('CHATA_ID', selectedChataId);
        formData.append('Name', selectedData.name);
        formData.append('ASC_Status', ascStatus);
        formData.append('ADHD_Status', adhdStatus);
        formData.append('Key_Clinical_Observations', window.fieldContents['clinical-observations'] || '');
        formData.append('Strengths_and_Abilities', window.fieldContents['strengths-abilities'] || '');
        formData.append('Priority_Support_Areas', window.fieldContents['priority-support'] || '');
        formData.append('Support_Recommendations', window.fieldContents['support-recommendations'] || '');
        formData.append('Professional_Referrals', professionalReferrals);

        // Submit to Google Apps Script
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
        }

        const result = await response.json();
        
        if (result.result === 'success') {
            alert('Assessment submitted successfully!');
            if (confirm('Would you like to clear the form?')) {
                clearForm();
            }
        } else {
            throw new Error('Submission failed: ' + result.error);
        }

    } catch (error) {
        console.error('Submission error:', error);
        alert(`Error submitting form: ${error.message}`);
    }
}

