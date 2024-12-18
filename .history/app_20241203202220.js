// Sheety API configuration
const SHEETY_BASE_URL = 'https://api.sheety.co/d9da852d0370030da19c227582af6f3a/chataScores';
const ALL_REPORTS_URL_API = `${https://api.sheety.co/d9da852d0370030da19c227582af6f3a/chataScores/allReportsUrl}/allReportsUrl`;
const R3_FORM_API = `${https://api.sheety.co/d9da852d0370030da19c227582af6f3a/chataScores/r3Form}/r3Form`;

// Keep all existing code unchanged until loadChataData function

async function loadChataData() {
    try {
        const response = await fetch(ALL_REPORTS_URL_API, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch CHATA data');
        }

        const data = await response.json();
        console.log('Raw CHATA data from All_Reports_URL:', data);
        
        // Map the data from Sheety's response format
        chataData = data.allReportsUrls
            .filter(row => {
                const id = row.chataId || row.uniqueId;
                const name = row.name || row.childName;
                console.log('Processing row:', { id, name });
                return id && id !== "CHATA_ID" && id !== "Unique_ID" && name;
            })
            .map(row => ({
                id: row.chataId || row.uniqueId,
                name: row.name || row.childName
            }));

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
    } catch (error) {
        console.error('Error loading CHATA data:', error);
    }
}

// ... existing code ...

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

        // First check for existing entries
        const existingEntriesResponse = await fetch(R3_FORM_API, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!existingEntriesResponse.ok) {
            throw new Error('Failed to check existing entries');
        }

        const existingEntries = await existingEntriesResponse.json();
        console.log('All existing entries:', existingEntries);

        // Find entries with matching CHATA_ID
        const matchingEntries = existingEntries.r3Forms.filter(entry => entry.chataId === selectedChataId);
        console.log('Found matching entries:', matchingEntries);

        if (matchingEntries.length > 0) {
            const userChoice = confirm(
                `An assessment for ${selectedChataId} already exists.\n\n` +
                'Click OK to update the existing assessment, or Cancel to abort submission.'
            );
            
            if (!userChoice) {
                return; // User chose to cancel
            }

            // Delete existing entries
            for (const entry of matchingEntries) {
                const deleteUrl = `${R3_FORM_API}/${entry.id}`;
                console.log('Deleting entry at:', deleteUrl);

                const deleteResponse = await fetch(deleteUrl, {
                    method: 'DELETE',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });

                if (!deleteResponse.ok) {
                    throw new Error(`Failed to delete entry ${entry.id}`);
                }

                console.log(`Deleted entry ${entry.id}`);
            }
        }

        // Create new entry
        const formData = {
            r3Form: {
                chataId: selectedChataId,
                name: selectedData.name,
                timestamp: new Date().toISOString(),
                ascStatus: ascStatus,
                adhdStatus: adhdStatus,
                keyClinicalObservations: window.fieldContents['clinical-observations'] || '',
                strengthsAndAbilities: window.fieldContents['strengths-abilities'] || '',
                prioritySupportAreas: window.fieldContents['priority-support'] || '',
                supportRecommendations: window.fieldContents['support-recommendations'] || '',
                professionalReferrals: professionalReferrals
            }
        };

        const createResponse = await fetch(R3_FORM_API, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.error('Create response:', errorText);
            throw new Error(`Failed to create new entry. Status: ${createResponse.status}`);
        }

        const result = await createResponse.json();
        console.log('Create result:', result);

        alert('Assessment submitted successfully!');

        if (confirm('Would you like to clear the form?')) {
            clearForm();
        }

    } catch (error) {
        console.error('Submission error:', error);
        alert(`Error submitting form: ${error.message}`);
    }
}

// ... rest of the existing code ...

