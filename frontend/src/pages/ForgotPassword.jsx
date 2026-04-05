import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE } from "../config";
import {
  clearStoredResetPasswordState,
  clearStoredUserSession,
  hasStoredUserSession,
  setStoredResetPasswordState,
} from "../utils/auth";
import { fetchWithTimeout, isAbortError } from "../utils/http";
import { useToast } from "../components/toastContext";
import logo from "../assets/logo.jpg";
import "./ForgotPassword.css";

const OTP_LENGTH = 6;

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

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (hasStoredUserSession()) {
      navigate("/", { replace: true });
      return;
    }

    clearStoredUserSession();
  }, [navigate]);

  const handleRequestOtp = async (event) => {
    event?.preventDefault();

    if (isRequestingOtp || isVerifyingOtp) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    setError("");
    setSuccess("");

    if (!normalizedEmail) {
      const message = "Please enter your email address.";
      setError(message);
      showToast({ type: "error", title: "OTP Not Sent", message });
      return;
    }

    if (!normalizedEmail.includes("@")) {
      const message = "Please enter a valid email address.";
      setError(message);
      showToast({ type: "error", title: "OTP Not Sent", message });
      return;
    }

    clearStoredResetPasswordState();
    setIsRequestingOtp(true);

    try {
      const response = await fetchWithTimeout(
        `${API_BASE}/auth/forgot-password/request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail }),
        }
      );
      const data = await readJson(response);

      if (!response.ok) {
        const message = getErrorMessage(
          data,
          "Unable to send a password reset OTP."
        );
        setError(message);
        showToast({ type: "error", title: "OTP Not Sent", message });
        return;
      }

      setEmail(normalizedEmail);
      setOtpRequested(true);
      setOtp("");

      const message =
        data?.message ||
        "A password reset OTP has been sent to your email address.";
      setSuccess(message);
      showToast({ type: "success", title: "OTP Sent", message });
    } catch (error) {
      const message = isAbortError(error)
        ? "The server is taking too long to respond. Please try again in a moment."
        : "Cannot connect to the server right now. Please try again later.";
      setError(message);
      showToast({ type: "error", title: "OTP Not Sent", message });
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();

    if (isVerifyingOtp || isRequestingOtp) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = otp.trim();

    setError("");
    setSuccess("");

    if (!normalizedEmail || !otpRequested) {
      const message = "Request an OTP first before verifying your identity.";
      setError(message);
      showToast({ type: "error", title: "OTP Verification Failed", message });
      return;
    }

    if (!normalizedOtp) {
      const message = "Please enter the OTP sent to your email.";
      setError(message);
      showToast({ type: "error", title: "OTP Verification Failed", message });
      return;
    }

    if (!/^\d{6}$/.test(normalizedOtp)) {
      const message = `OTP must be ${OTP_LENGTH} digits.`;
      setError(message);
      showToast({ type: "error", title: "OTP Verification Failed", message });
      return;
    }

    setIsVerifyingOtp(true);

    try {
      const response = await fetchWithTimeout(
        `${API_BASE}/auth/forgot-password/verify-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: normalizedEmail,
            otp: normalizedOtp,
          }),
        }
      );
      const data = await readJson(response);

      if (!response.ok) {
        const message = getErrorMessage(data, "Unable to verify your OTP.");
        setError(message);
        showToast({ type: "error", title: "OTP Verification Failed", message });
        return;
      }

      if (!data?.resetToken) {
        const message =
          "OTP verification succeeded but no reset session was returned.";
        setError(message);
        showToast({ type: "error", title: "OTP Verification Failed", message });
        return;
      }

      setStoredResetPasswordState({
        token: data.resetToken,
        email: data.email || normalizedEmail,
      });

      const message = data.message || "OTP verified successfully.";
      setSuccess(message);
      showToast({ type: "success", title: "OTP Verified", message });

      window.setTimeout(() => {
        navigate("/reset-password", { replace: true });
      }, 900);
    } catch (error) {
      const message = isAbortError(error)
        ? "The server is taking too long to respond. Please try again in a moment."
        : "Cannot connect to the server right now. Please try again later.";
      setError(message);
      showToast({ type: "error", title: "OTP Verification Failed", message });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleUseAnotherEmail = () => {
    clearStoredResetPasswordState();
    setOtpRequested(false);
    setOtp("");
    setError("");
    setSuccess("");
  };

  return (
    <section className="forgot-page">
      <div className="forgot-shell">
        <aside className="forgot-side">
          <div className="forgot-brand">
            <img
              className="forgot-brand-mark"
              src={logo}
              alt="Flash Gather logo"
            />
            <span>FlashGather</span>
          </div>

          <div className="forgot-side-copy">
            <p className="forgot-side-kicker">Account recovery</p>
            <h1 className="forgot-side-title">Verify your OTP first</h1>
            <p className="forgot-side-text">
              Request a 6-digit code for your email, verify it, and then we&apos;ll
              take you to the final password reset step.
            </p>
          </div>

          <div className="forgot-side-actions">
            <Link to="/login" className="forgot-side-button">
              Back to Login
            </Link>
            <Link to="/register" className="forgot-side-link">
              Need an account?
            </Link>
          </div>
        </aside>

        <div className="forgot-card">
          <div className="forgot-card-inner">
            <header className="forgot-header">
              <p className="forgot-title">Forgot Password</p>
              <p className="forgot-subtitle">
                {otpRequested
                  ? "Enter the OTP from your email to unlock the reset form."
                  : "We&apos;ll send a one-time password to your email."}
              </p>
            </header>

            <form
              className="forgot-form"
              onSubmit={otpRequested ? handleVerifyOtp : handleRequestOtp}
            >
              <label className="forgot-field" htmlFor="forgot-email">
                <span className="forgot-field-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 6h16v12H4V6zm0 0l8 6 8-6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <input
                  id="forgot-email"
                  className="forgot-input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email"
                  autoComplete="email"
                  disabled={otpRequested || isRequestingOtp || isVerifyingOtp}
                  required
                />
              </label>

              {!otpRequested ? (
                <button
                  type="submit"
                  className="forgot-submit"
                  disabled={isRequestingOtp || isVerifyingOtp}
                >
                  {isRequestingOtp ? "Sending OTP..." : "Send OTP"}
                </button>
              ) : (
                <>
                  <div className="forgot-step">
                    <p className="forgot-step-title">OTP sent</p>
                    <p className="forgot-step-text">
                      Use the 6-digit code sent to <strong>{email}</strong>.
                    </p>
                  </div>

                  <label className="forgot-field" htmlFor="forgot-otp">
                    <span className="forgot-field-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">
                        <path
                          d="M8 7h8M7 12h10M9 17h6"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <rect
                          x="4"
                          y="4"
                          width="16"
                          height="16"
                          rx="3"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />
                      </svg>
                    </span>
                    <input
                      id="forgot-otp"
                      className="forgot-input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={OTP_LENGTH}
                      value={otp}
                      onChange={(event) =>
                        setOtp(
                          event.target.value
                            .replace(/\D/g, "")
                            .slice(0, OTP_LENGTH)
                        )
                      }
                      placeholder="6-digit OTP"
                      disabled={isRequestingOtp || isVerifyingOtp}
                      required
                    />
                  </label>

                  <div className="forgot-actions">
                    <button
                      type="submit"
                      className="forgot-submit"
                      disabled={isVerifyingOtp || isRequestingOtp}
                    >
                      {isVerifyingOtp ? "Verifying OTP..." : "Verify OTP"}
                    </button>

                    <button
                      type="button"
                      className="forgot-secondary"
                      onClick={handleRequestOtp}
                      disabled={isRequestingOtp || isVerifyingOtp}
                    >
                      {isRequestingOtp ? "Sending..." : "Send Another OTP"}
                    </button>

                    <button
                      type="button"
                      className="forgot-text-button"
                      onClick={handleUseAnotherEmail}
                      disabled={isRequestingOtp || isVerifyingOtp}
                    >
                      Use another email
                    </button>
                  </div>
                </>
              )}

              {error ? <p className="forgot-message forgot-error">{error}</p> : null}
              {success ? (
                <p className="forgot-message forgot-success">{success}</p>
              ) : null}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
