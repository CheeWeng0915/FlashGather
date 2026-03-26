const isDev = import.meta.env.DEV;
const productionApiUrl = 'https://flashgather.onrender.com';

// In production we expect VITE_API_URL to point at the deployed backend.
export const API_BASE = import.meta.env.VITE_API_URL || (isDev ? '/api' : productionApiUrl);
