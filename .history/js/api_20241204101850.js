import { CACHE_KEYS, ALL_URL_API } from './config.js';

let chataData = [];
let isLoadingData = false;

// Function to check if cache is valid
function isCacheValid() {
    const timestamp = localStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP);
    if (!timestamp) return false;
    
    const now = new Date().getTime();
    const cacheTime = parseInt(timestamp);
    return (now - cacheTime) < CACHE_KEYS.CACHE_DURATION;
}

// Function to get cached data
function getCachedData() {
    try {
        const cachedData = localStorage.getItem(CACHE_KEYS.CHATA_DATA);
        return cachedData ? JSON.parse(cachedData) : null;
    } catch (error) {
        console.error('Error reading from cache:', error);
        return null;
    }
}

// Function to set cache data
function setCacheData(data) {
    try {
        localStorage.setItem(CACHE_KEYS.CHATA_DATA, JSON.stringify(data));
        localStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMP, new Date().getTime().toString());
    } catch (error) {
        console.error('Error setting cache:', error);
    }
}

// Function to clear cache
function clearCache() {
    try {
        localStorage.removeItem(CACHE_KEYS.CHATA_DATA);
        localStorage.removeItem(CACHE_KEYS.CACHE_TIMESTAMP);
    } catch (error) {
        console.error('Error clearing cache:', error);
    }
}

// Function to load CHATA data
async function loadChataData(forceRefresh = false) {
    if (isLoadingData) {
        console.log('Already loading data, skipping request');
        return;
    }

    try {
        isLoadingData = true;

        // Check cache first unless force refresh is requested
        if (!forceRefresh && isCacheValid()) {
            const cachedData = getCachedData();
            if (cachedData && cachedData.length > 0) {
                console.log('Loading data from cache (expires in:', 
                    Math.round((CACHE_KEYS.CACHE_DURATION - (new Date().getTime() - parseInt(localStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP)))) / 1000), 
                    'seconds)');
                chataData = cachedData;
                return chataData;
            }
        }

        console.log('Fetching fresh data from API:', ALL_URL_API);
        
        const response = await fetch(ALL_URL_API);
        const json = await response.json();
        console.log('Raw CHATA data:', json);
        
        if (!json || !json.allUrl) {
            throw new Error('Invalid data format received from API');
        }

        chataData = json.allUrl
            .filter(row => row.chataId && row.chataId !== "CHATA_ID")
            .map(row => ({
                id: row.chataId,
                name: row.childName,
                r1Url: row['r1Generated (pdf)'],
                r2Url: row['r2Generated (pdf)']
            }));

        console.log('Processed CHATA data:', chataData);
        
        if (chataData.length === 0) {
            throw new Error('No valid data received from API');
        }

        setCacheData(chataData);
        return chataData;

    } catch (error) {
        console.error('Error loading CHATA data:', error);
        const cachedData = getCachedData();
        if (cachedData && cachedData.length > 0) {
            console.log('Using cached data as fallback');
            chataData = cachedData;
            return chataData;
        }
        throw error;
    } finally {
        isLoadingData = false;
    }
}

// Function to submit form data
async function submitFormData(formData) {
    try {
        const response = await fetch(R3_FORM_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                r3Form: formData
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error submitting form:', error);
        throw error;
    }
}

export {
    loadChataData,
    submitFormData,
    clearCache,
    getCachedData
}; 