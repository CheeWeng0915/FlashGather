export const TOKEN_STORAGE_KEY = "token";
export const USER_STORAGE_KEY = "currentUser";

export const getStoredToken = () => localStorage.getItem(TOKEN_STORAGE_KEY);

export const getStoredUser = () => {
  const storedUser = localStorage.getItem(USER_STORAGE_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    return null;
  }
};

export const hasStoredUserSession = () => {
  const token = getStoredToken();
  const user = getStoredUser();

  if (!token || !user) {
    return false;
  }

  return Boolean(user.id || user.email || user.username);
};

export const clearStoredUserSession = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
};

export const getAuthHeaders = (headers = {}) => {
  const token = getStoredToken();

  if (!token) {
    return { ...headers };
  }

  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
};
