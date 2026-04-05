import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE } from "../config";
import {
  clearStoredResetPasswordState,
  clearStoredUserSession,
  getStoredResetPasswordEmail,
  getStoredResetPasswordToken,
  hasStoredUserSession,
} from "../utils/auth";
import { fetchWithTimeout, isAbortError } from "../utils/http";
import { useToast } from "../components/toastContext";
import logo from "../assets/logo.jpg";
import "./ResetPassword.css";

const getErrorMessage = (payload, fallbackMessage) => {
  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    return payload.errors[0]?.msg || fallbackMessage;
  }

  if (typeof payload?.error === "string" && payload.error.trim()) {
    return payload.error;
  }

  return fallbackMessage;
};

const readJson = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json") ? response.json() : null;
};

export default function ResetPassword() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (hasStoredUserSession()) {
      navigate("/", { replace: true });
      return;
    }

    clearStoredUserSession();

    const storedResetToken = getStoredResetPasswordToken();
    const storedEmail = getStoredResetPasswordEmail();

    if (!storedResetToken || !storedEmail) {
      clearStoredResetPasswordState();
      showToast({
        type: "error",
        title: "Reset Session Missing",
        message: "Verify your OTP first before resetting your password.",
      });
      navigate("/forgot-password", { replace: true });
      return;
    }

    setEmail(storedEmail);
  }, [navigate, showToast]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const resetToken = getStoredResetPasswordToken();

    setError("");
    setSuccess("");

    if (!resetToken) {
      const message =
        "Your reset session expired. Please verify a new OTP before continuing.";
      clearStoredResetPasswordState();
      showToast({ type: "error", title: "Reset Failed", message });
      navigate("/forgot-password", { replace: true });
      return;
    }

    if (!newPassword || !confirmPassword) {
      const message = "Please complete all password fields.";
      setError(message);
      showToast({ type: "error", title: "Reset Failed", message });
      return;
    }

    if (newPassword.length < 6) {
      const message = "New password must be at least 6 characters.";
      setError(message);
      showToast({ type: "error", title: "Reset Failed", message });
      return;
    }

    if (newPassword !== confirmPassword) {
      const message = "New password and confirmation do not match.";
      setError(message);
      showToast({ type: "error", title: "Reset Failed", message });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetchWithTimeout(`${API_BASE}/auth/forgot-password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetToken,
          newPassword,
        }),
      });
      const data = await readJson(response);

      if (!response.ok) {
        const message = getErrorMessage(data, "Unable to reset your password.");
        setError(message);
        showToast({ type: "error", title: "Reset Failed", message });

        if (message.toLowerCase().includes("reset session")) {
          clearStoredResetPasswordState();
          navigate("/forgot-password", { replace: true });
        }
        return;
      }

      const message =
        data?.message || "Password reset successfully. Please sign in again.";
      clearStoredResetPasswordState();
      setSuccess(message);
      setNewPassword("");
      setConfirmPassword("");
      showToast({ type: "success", title: "Password Reset", message });

      window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 900);
    } catch (error) {
      const message = isAbortError(error)
        ? "The server is taking too long to respond. Please try again in a moment."
        : "Cannot connect to the server right now. Please try again later.";
      setError(message);
      showToast({ type: "error", title: "Reset Failed", message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartOver = () => {
    clearStoredResetPasswordState();
    navigate("/forgot-password", { replace: true });
  };

  return (
    <section className="reset-page">
      <div className="reset-shell">
        <aside className="reset-side">
          <div className="reset-brand">
            <img className="reset-brand-mark" src={logo} alt="Flash Gather logo" />
            <span>FlashGather</span>
          </div>

          <div className="reset-side-copy">
            <p className="reset-side-kicker">Verified access</p>
            <h1 className="reset-side-title">Create your new password</h1>
            <p className="reset-side-text">
              Your OTP verification is complete. Choose a fresh password for{" "}
              <strong>{email || "your account"}</strong> to finish the reset.
            </p>
          </div>

          <div className="reset-side-actions">
            <Link to="/login" className="reset-side-button">
              Back to Login
            </Link>
            <button
              type="button"
              className="reset-side-link"
              onClick={handleStartOver}
            >
              Start over
            </button>
          </div>
        </aside>

        <div className="reset-card">
          <div className="reset-card-inner">
            <header className="reset-header">
              <p className="reset-title">Reset Password</p>
              <p className="reset-subtitle">
                Enter a new password for <strong>{email || "your account"}</strong>.
              </p>
            </header>

            <form className="reset-form" onSubmit={handleSubmit}>
              <label className="reset-field" htmlFor="reset-new-password">
                <span className="reset-field-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M7 11V8a5 5 0 1110 0v3m-9 0h8a2 2 0 012 2v5H6v-5a2 2 0 012-2z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <input
                  id="reset-new-password"
                  className="reset-input"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="New password"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  className="reset-toggle"
                  onClick={() => setShowNewPassword((value) => !value)}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                  disabled={isSubmitting}
                >
                  {showNewPassword ? "Hide" : "Show"}
                </button>
              </label>

              <label className="reset-field" htmlFor="reset-confirm-password">
                <span className="reset-field-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M7 11V8a5 5 0 1110 0v3m-9 0h8a2 2 0 012 2v5H6v-5a2 2 0 012-2z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9.5 15l1.7 1.7L14.5 13.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <input
                  id="reset-confirm-password"
                  className="reset-input"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  className="reset-toggle"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </label>

              {error ? <p className="reset-message reset-error">{error}</p> : null}
              {success ? (
                <p className="reset-message reset-success">{success}</p>
              ) : null}

              <button type="submit" className="reset-submit" disabled={isSubmitting}>
                {isSubmitting ? "Resetting Password..." : "Reset Password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
