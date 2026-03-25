const isDev = import.meta.env.DEV;

export const API_BASE = import.meta.env.VITE_API_URL || (isDev ? '/api' : 'http://localhost:5000');
