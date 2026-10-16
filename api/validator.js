/**
 * ============================================================================
 * AegisPoint IEP Advocacy & Consulting - Strict Validator Module
 * Shared validation rules and helper functions for backend and frontend tests.
 * ============================================================================
 */

const PATTERNS = {
  // Letters only, allows single space between names. No numbers, no special characters.
  name: /^[A-Za-z]+(?: [A-Za-z]+)*$/,

  // Mandatory '@', mandatory domain and dot, at least 2 chars TLD.
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,

  // Numbers only, exactly 10 digits
  mobile: /^\d{10}$/,

  // Digits only
  digits: /^\d+$/,

  // General integer
  integer: /^-?\d+$/,

  // Amount
  amount: /^\d+(?:\.\d{1,2})?$/,

  // Password min 8 chars with uppercase, lowercase and number
  passwordStrong: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,

  // Date YYYY-MM-DD
  date: /^\d{4}-\d{2}-\d{2}$/
};

const MESSAGES = {
  required: "This field is required.",
  name: "Enter letters only (spaces allowed). No numbers or special characters.",
  email: "Enter a valid email address (e.g. name@example.com).",
  mobile: "Enter a valid 10-digit mobile number.",
  age: "Please enter a valid age between 5 and 14.",
  generalAge: "Enter an age between 1 and 120.",
  number: "Numbers only are allowed.",
  password: "Password must be at least 8 characters with uppercase, lowercase and a number.",
  passwordMin6: "Password must be at least 6 characters.",
  consent: "You must consent to proceed.",
  minlength: (n) => `Please enter at least ${n} characters.`,
  maxlength: (n) => `Please enter no more than ${n} characters.`
};

/**
 * Validate a Name field
 * Letters only (A-Z, a-z) and spaces between words. No numbers, no special characters.
 */
function validateName(value, label = "Name", required = true) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return required ? `${label} is required.` : null;
  }
  const clean = String(value).trim();
  if (!PATTERNS.name.test(clean)) {
    return MESSAGES.name;
  }
  return null;
}

/**
 * Validate a Mobile Number field
 * Numbers only, exactly 10 digits.
 */
function validateMobile(value, label = "Mobile number", required = true) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return required ? `${label} is required.` : null;
  }
  const clean = String(value).trim();
  if (!PATTERNS.mobile.test(clean)) {
    return MESSAGES.mobile;
  }
  return null;
}

/**
 * Validate an Email field
 * Strict email regex: requires '@' and a valid domain + 2+ char TLD.
 */
function validateEmail(value, label = "Email address", required = true) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return required ? `${label} is required.` : null;
  }
  const clean = String(value).trim();
  if (!PATTERNS.email.test(clean)) {
    return MESSAGES.email;
  }
  return null;
}

/**
 * Validate Age field
 * Digits only, within min and max range.
 */
function validateAge(value, min = 5, max = 14, required = true) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return required ? "Child's age is required." : null;
  }
  const clean = String(value).trim();
  if (!PATTERNS.digits.test(clean)) {
    return "Age must contain numbers only.";
  }
  const num = parseInt(clean, 10);
  if (isNaN(num) || num < min || num > max) {
    return `Please enter a valid age between ${min} and ${max}.`;
  }
  return null;
}

/**
 * Validate Contact Form Submission
 */
function validateContactForm(data = {}) {
  const errors = {};

  const nameErr = validateName(data.fullName || data.parentName, "Parent Full Name", true);
  if (nameErr) errors.fullName = nameErr;

  const emailErr = validateEmail(data.email, "Email Address", true);
  if (emailErr) errors.email = emailErr;

  const mobileErr = validateMobile(data.mobile || data.phone, "Mobile Number", true);
  if (mobileErr) errors.mobile = mobileErr;

  if (data.childAge !== undefined) {
    const ageErr = validateAge(data.childAge, 5, 14, true);
    if (ageErr) errors.childAge = ageErr;
  }

  if (data.helpType !== undefined) {
    if (!data.helpType || String(data.helpType).trim() === "") {
      errors.helpType = "Please select a service.";
    }
  }

  if (data.bestTime !== undefined) {
    if (!data.bestTime || String(data.bestTime).trim() === "") {
      errors.bestTime = "Please select a preferred time.";
    }
  }

  const msg = data.message ? String(data.message).trim() : "";
  if (!msg) {
    errors.message = "Message is required.";
  } else if (msg.length < 10) {
    errors.message = "Please enter at least 10 characters.";
  }

  if (data.consent !== undefined && data.consent !== true && data.consent !== "true" && data.consent !== "on" && data.consent !== 1) {
    errors.consent = MESSAGES.consent;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate Consultation Form Submission (Index page)
 */
function validateConsultationForm(data = {}) {
  const errors = {};

  const nameErr = validateName(data.parentName || data.fullName, "Parent full name", true);
  if (nameErr) errors.parentName = nameErr;

  const emailErr = validateEmail(data.email, "Email", true);
  if (emailErr) errors.email = emailErr;

  const mobileErr = validateMobile(data.mobile, "Mobile number", true);
  if (mobileErr) errors.mobile = mobileErr;

  const ageErr = validateAge(data.childAge, 1, 22, true);
  if (ageErr) errors.childAge = ageErr;

  const msg = data.message ? String(data.message).trim() : "";
  if (!msg) {
    errors.message = "Message is required.";
  } else if (msg.length < 10) {
    errors.message = "Please enter at least 10 characters.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate Newsletter Submission
 */
function validateNewsletter(data = {}) {
  const errors = {};
  const emailErr = validateEmail(data.email || data.newsletterEmail || data.notifyEmail, "Email", true);
  if (emailErr) errors.email = emailErr;

  if (data.name) {
    const nameErr = validateName(data.name, "Name", false);
    if (nameErr) errors.name = nameErr;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate Login Submission
 */
function validateLogin(data = {}) {
  const errors = {};
  const emailErr = validateEmail(data.email || data.loginEmail, "Email address", true);
  if (emailErr) errors.loginEmail = emailErr;

  const pw = data.password || data.loginPassword;
  if (!pw || String(pw).trim() === "") {
    errors.loginPassword = "Password is required.";
  } else if (String(pw).length < 6) {
    errors.loginPassword = "Password must be at least 6 characters.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate Profile Submission
 */
function validateProfile(data = {}) {
  const errors = {};
  if (data.fullName !== undefined) {
    const nameErr = validateName(data.fullName, "Full Name", true);
    if (nameErr) errors.fullName = nameErr;
  }
  if (data.email !== undefined) {
    const emailErr = validateEmail(data.email, "Email Address", true);
    if (emailErr) errors.email = emailErr;
  }
  if (data.mobile !== undefined || data.phone !== undefined) {
    const mobileErr = validateMobile(data.mobile || data.phone, "Mobile Phone", true);
    if (mobileErr) errors.mobile = mobileErr;
  }
  if (data.secondaryGuardian) {
    const secErr = validateName(data.secondaryGuardian, "Secondary Guardian", false);
    if (secErr) errors.secondaryGuardian = secErr;
  }
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PATTERNS,
    MESSAGES,
    validateName,
    validateMobile,
    validateEmail,
    validateAge,
    validateContactForm,
    validateConsultationForm,
    validateNewsletter,
    validateLogin,
    validateProfile
  };
}
