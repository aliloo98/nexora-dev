/**
 * Nexora - Authentication Styles
 * 
 * Styles for login and register pages.
 * Modern, responsive, and themed with Nexora design system.
 * 
 * TODO: Integrate with existing theme system for color consistency
 */

export const authStyles = `
/* Auth Container */
.auth-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at top right, #121225 0%, #07070d 60%, #030306 100%);
  z-index: 9999;
  padding: 1rem;
  font-family: 'Outfit', sans-serif;
}

/* Form Container */
.auth-form-container {
  width: 100%;
  max-width: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: slideUp 0.6s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Form Card */
.auth-form-card {
  width: 100%;
  background: rgba(18, 18, 37, 0.95);
  border: 1px solid rgba(212, 175, 55, 0.15);
  border-radius: 16px;
  padding: 2.5rem 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
}

/* Form Header */
.auth-form-header {
  text-align: center;
  margin-bottom: 2rem;
}

.auth-form-logo-img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 20px;
  margin-bottom: 1rem;
  display: inline-block;
  animation: bounce 0.6s ease-out;
  box-shadow: 0 8px 20px rgba(212, 175, 55, 0.25), 0 0 1px rgba(212, 175, 55, 0.1);
}

@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.auth-form-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #f3e5ab;
  margin: 0.5rem 0;
  background: linear-gradient(135deg, #d4af37 0%, #f3e5ab 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.auth-form-subtitle {
  font-size: 0.95rem;
  color: #a0a0b8;
  margin: 0.5rem 0 0 0;
}

/* Form */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Form Group */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-checkbox {
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
}

.form-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #d4af37;
}

.checkbox-label {
  font-size: 0.9rem;
  color: #a0a0b8;
  cursor: pointer;
  user-select: none;
}

/* Form Label */
.form-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #d4af37;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Form Input */
.form-input {
  padding: 0.85rem 1rem;
  background: rgba(10, 10, 20, 0.8);
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 8px;
  color: #f0f0f5;
  font-size: 0.95rem;
  font-family: 'Outfit', sans-serif;
  transition: all 0.3s ease;
}

.form-input:focus {
  outline: none;
  background: rgba(10, 10, 20, 1);
  border-color: rgba(212, 175, 55, 0.6);
  box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1);
}

.form-input::placeholder {
  color: #6a6a80;
}

/* Form Hint */
.form-hint {
  font-size: 0.75rem;
  color: #7a7a8a;
  margin-top: -0.3rem;
}

/* Form Error */
.form-error {
  font-size: 0.75rem;
  color: #f87171;
  min-height: 1rem;
}

.form-error-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(244, 63, 94, 0.1);
  border: 1px solid rgba(244, 63, 94, 0.3);
  border-radius: 8px;
  color: #fca5ac;
  font-size: 0.9rem;
}

/* Loading State */
.form-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.75rem;
  color: #d4af37;
  font-size: 0.9rem;
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(212, 175, 55, 0.2);
  border-top-color: #d4af37;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Buttons */
.btn {
  padding: 0.85rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Outfit', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn-primary {
  background: linear-gradient(135deg, #d4af37 0%, #e5c060 100%);
  color: #030306;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(212, 175, 55, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: rgba(212, 175, 55, 0.1);
  color: #d4af37;
  border: 1px solid rgba(212, 175, 55, 0.3);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(212, 175, 55, 0.2);
  border-color: rgba(212, 175, 55, 0.5);
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-outline {
  background: transparent;
}

.btn-large {
  padding: 1rem 1.5rem;
}

/* Form Footer */
.auth-form-footer {
  text-align: center;
  margin-top: 1.5rem;
  border-top: 1px solid rgba(212, 175, 55, 0.1);
  padding-top: 1.5rem;
}

.auth-form-footer p {
  margin: 0.5rem 0;
  color: #a0a0b8;
  font-size: 0.9rem;
}

.auth-link {
  color: #d4af37;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.3s ease;
}

.auth-link:hover {
  color: #f3e5ab;
  text-decoration: underline;
}

/* Responsive */
@media (max-width: 480px) {
  .auth-form-card {
    padding: 1.75rem 1.25rem;
  }

  .auth-form-title {
    font-size: 1.5rem;
  }

  .auth-form-logo-img {
    width: 72px;
    height: 72px;
  }

  .form-group {
    gap: 0.4rem;
  }

  .btn {
    padding: 0.75rem 1.25rem;
    font-size: 0.85rem;
  }
}

/* Dark mode (already active by default in Nexora) */
@media (prefers-color-scheme: dark) {
  .auth-container {
    background: radial-gradient(circle at top right, #121225 0%, #07070d 60%, #030306 100%);
  }

  .form-input {
    background: rgba(10, 10, 20, 0.8);
    color: #f0f0f5;
  }
}
`

export default authStyles
