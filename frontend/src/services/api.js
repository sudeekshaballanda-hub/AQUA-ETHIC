// ============================================================
// AQUA-ETHIC — Frontend API Service
// ============================================================

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

// ===== GET LATEST READING =====
export const getLatestReading = async (deviceId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/sensor-data/latest/${deviceId}`);
        if (!response.ok) throw new Error('Failed to fetch');
        return await response.json();
    } catch (error) {
        console.error('❌ Error fetching latest reading:', error);
        throw error;
    }
};

// ===== GET HISTORY =====
export const getHistory = async (deviceId, limit = 100) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/sensor-data/history/${deviceId}?limit=${limit}`);
        if (!response.ok) throw new Error('Failed to fetch history');
        return await response.json();
    } catch (error) {
        console.error('❌ Error fetching history:', error);
        throw error;
    }
};

// ===== VERIFY DATA ON BLOCKCHAIN =====
export const verifyData = async (dataHash) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/sensor-data/verify/${dataHash}`);
        if (!response.ok) throw new Error('Verification failed');
        return await response.json();
    } catch (error) {
        console.error('❌ Error verifying data:', error);
        throw error;
    }
};

// ===== GET ALL DEVICES =====
export const getAllDevices = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/devices`);
        if (!response.ok) throw new Error('Failed to fetch devices');
        return await response.json();
    } catch (error) {
        console.error('❌ Error fetching devices:', error);
        throw error;
    }
};

// ===== SEND SENSOR DATA (For testing) =====
export const sendSensorData = async (data) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/sensor-data/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to send data');
        return await response.json();
    } catch (error) {
        console.error('❌ Error sending data:', error);
        throw error;
    }
};