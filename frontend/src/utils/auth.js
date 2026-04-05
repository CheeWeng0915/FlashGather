export const TOKEN_STORAGE_KEY = "token";
export const USER_STORAGE_KEY = "currentUser";
export const RESET_PASSWORD_TOKEN_STORAGE_KEY = "resetPasswordToken";
export const RESET_PASSWORD_EMAIL_STORAGE_KEY = "resetPasswordEmail";

const decodeTokenPayload = (token) => {
  if (!token) {
    return null;
  }

  const segments = token.split(".");
  if (segments.length !== 3) {
    return null;
  }

  try {
    const base64 = segments[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return JSON.parse(window.atob(normalized));
  } catch {
    return null;
  }
};

export const isTokenExpired = (token) => {
  const payload = decodeTokenPayload(token);

  if (!payload?.exp) {
    return true;
  }

  return payload.exp * 1000 <= Date.now();
};

const getRawStoredToken = () => localStorage.getItem(TOKEN_STORAGE_KEY);
const getRawStoredResetPasswordToken = () =>
  sessionStorage.getItem(RESET_PASSWORD_TOKEN_STORAGE_KEY);

export const getStoredToken = () => {
  const token = getRawStoredToken();

  if (!token) {
    return null;
  }

  if (isTokenExpired(token)) {
    clearStoredUserSession();
    return null;
  }

  return token;
};

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

export const getStoredUserRole = () => {
  const user = getStoredUser();
  return user?.role === "admin" ? "admin" : "member";
};

export const isStoredUserAdmin = () =>
  hasStoredUserSession() && getStoredUserRole() === "admin";

export const setStoredUser = (user) => {
  if (!user) {
    localStorage.removeItem(USER_STORAGE_KEY);
    return;
  }

  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
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

export const setStoredResetPasswordState = ({ token, email }) => {
  if (!token || !email) {
    clearStoredResetPasswordState();
    return;
  }

  sessionStorage.setItem(RESET_PASSWORD_TOKEN_STORAGE_KEY, token);
  sessionStorage.setItem(RESET_PASSWORD_EMAIL_STORAGE_KEY, email);
};

export const clearStoredResetPasswordState = () => {
  sessionStorage.removeItem(RESET_PASSWORD_TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(RESET_PASSWORD_EMAIL_STORAGE_KEY);
};

export const getStoredResetPasswordToken = () => {
  const token = getRawStoredResetPasswordToken();

  if (!token) {
    return null;
  }

  if (isTokenExpired(token)) {
    clearStoredResetPasswordState();
    return null;
  }

  return token;
};

export const getStoredResetPasswordEmail = () => {
  const email = sessionStorage.getItem(RESET_PASSWORD_EMAIL_STORAGE_KEY);
  return email ? email.trim().toLowerCase() : null;
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
