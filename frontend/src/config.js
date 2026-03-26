const isDev = import.meta.env.DEV;
const configuredApiUrl = (import.meta.env.VITE_API_URL || '').trim();
const useRemoteApiInDev = import.meta.env.VITE_USE_REMOTE_API_IN_DEV === 'true';
const productionApiUrl = configuredApiUrl || 'https://flashgather.onrender.com';

// Local development should use the Vite proxy by default so new backend routes
// work immediately without depending on the deployed API being up to date.
export const API_BASE = isDev && !useRemoteApiInDev ? '/api' : productionApiUrl;
