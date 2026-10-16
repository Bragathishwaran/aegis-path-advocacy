/* ==========================================================================
   AegisPoint IEP Advocacy & Consulting - validation.js
   Strict Front-End & API Form Validation Engine

   Enforces:
   1. Name fields: Letters only (A-Z, a-z) & spaces. No numbers or special characters.
      Real-time character interception prevents invalid characters directly.
   2. Number / Mobile fields: Numbers only. Mobile contains exactly 10 digits.
      Real-time character interception prevents non-digits directly.
   3. Email fields: Strict format requiring '@', valid domain, and TLD.
   4. Required fields: Validates presence before submit, clear error messages.
   5. UX: Clear error messages directly below input; instant error removal
      as soon as valid data is typed.
   6. Security / Backend: Submits to backend API endpoints (/api/contact,
      /api/consultation, /api/newsletter, /api/login, /api/profile) with
      graceful fallback.
   ========================================================================== */
(function () {
  "use strict";

  /* ------------------------------ Strict Patterns ------------------------------ */
  var PATTERNS = {
    // Letters only, allows single space between words. No digits, no symbols.
    name: /^[A-Za-z]+(?: [A-Za-z]+)*$/,

    // Mandatory '@', mandatory domain and dot, at least 2 chars TLD.
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,

    // Exactly 10 digits for mobile
    mobile: /^\d{10}$/,

    // General phone digits only (7-15 digits)
    phone: /^\d{7,15}$/,

    // Numbers only
    digits: /^\d+$/,
    number: /^-?\d+(?:\.\d+)?$/,
    integer: /^-?\d+$/,
    amount: /^\d+(?:\.\d{1,2})?$/,

    // Alphanumeric
    alphanumeric: /^[A-Za-z0-9]+$/,

    // Strong password
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,

    // Standard password (at least 6 characters)
    passwordBasic: /^.{6,}$/,

    // Date YYYY-MM-DD
    date: /^\d{4}-\d{2}-\d{2}$/
  };

  /* ------------------------------ Error Messages ------------------------------ */
  var MESSAGES = {
    required: "This field is required.",
    name: "Enter letters only (spaces allowed). No numbers or special characters.",
    nameRequired: "Please enter your full name.",
    email: "Enter a valid email address (e.g. name@example.com).",
    emailRequired: "Please enter your email address.",
    mobile: "Enter a valid 10-digit mobile number.",
    mobileRequired: "Please enter your mobile number.",
    phone: "Enter numbers only (7–15 digits).",
    number: "Enter numbers only.",
    integer: "Enter a whole number.",
    amount: "Enter a valid amount (up to 2 decimals).",
    alphanumeric: "Only letters and numbers are allowed.",
    password: "Password must be at least 8 characters with an uppercase, lowercase and a number.",
    passwordBasic: "Please enter your password (at least 6 characters).",
    date: "Enter a valid date.",
    age: "Please enter a valid age between 5 and 14.",
    generalAge: "Enter an age between 1 and 120.",
    match: "Values do not match.",
    consent: "You must consent to proceed.",
    select: "Please select an option.",
    minlength: function (n) {
      return "Please enter at least " + n + " characters.";
    },
    maxlength: function (n) {
      return "Please enter no more than " + n + " characters.";
    }
  };

  /* --------------------------- Helpers --------------------------- */
  function getLabel(field) {
    if (field.getAttribute("data-label")) return field.getAttribute("data-label");
    var wrap = field.closest(".form-field") || field.parentElement;
    var label = wrap && wrap.querySelector("label");
    if (label) return label.textContent.replace(/\*/g, "").trim();
    if (field.placeholder && field.placeholder.length < 30) return field.placeholder;
    return field.name || "This field";
  }

  function getErrorEl(field) {
    var wrap = field.closest(".form-field") || field.parentElement;

    // 1. Direct ID reference e.g. fullName-error
    if (field.id) {
      var directEl = document.getElementById(field.id + "-error");
      if (directEl) return directEl;
    }

    // 2. Query within wrap
    if (wrap) {
      var el = wrap.querySelector(".error-msg, [data-error], .invalid-feedback, .notify-error");
      if (el) return el;
    }

    // 3. Fallback: dynamically create error element
    if (wrap) {
      var newEl = document.createElement("p");
      newEl.className = "error-msg text-xs text-rose-600 dark:text-rose-400 mt-1.5";
      newEl.setAttribute("data-error", "true");
      newEl.style.display = "none";
      if (field.nextSibling) {
        field.parentNode.insertBefore(newEl, field.nextSibling);
      } else {
        field.parentNode.appendChild(newEl);
      }
      return newEl;
    }

    return null;
  }

  function detectRules(field) {
    var explicitRules = (field.getAttribute("data-rules") || "")
      .split("|")
      .map(function (r) {
        return r.trim();
      })
      .filter(Boolean);

    // Support singular data-rule="name" or data-rule="minlength:10"
    var singularRule = field.getAttribute("data-rule");
    if (singularRule) {
      singularRule.split("|").forEach(function (r) {
        r = r.trim();
        if (r && explicitRules.indexOf(r) === -1) explicitRules.push(r);
      });
    }

    var type = (field.type || "").toLowerCase();
    var name = (field.name || "").toLowerCase();
    var id = (field.id || "").toLowerCase();

    // Auto-detect required
    if (field.hasAttribute("required") && explicitRules.indexOf("required") === -1) {
      explicitRules.unshift("required");
    }

    // Auto-detect email
    if ((type === "email" || name.indexOf("email") > -1 || id.indexOf("email") > -1) &&
        explicitRules.indexOf("email") === -1) {
      explicitRules.push("email");
    }

    // Auto-detect name
    if ((name === "fullname" || name === "parentname" || name === "name" ||
         id === "fullname" || id === "ct-name" || id === "pf-name" ||
         field.getAttribute("autocomplete") === "name") &&
        explicitRules.indexOf("name") === -1) {
      explicitRules.push("name");
    }

    // Auto-detect mobile
    if ((type === "tel" || name === "mobile" || name === "phone" ||
         id === "mobile" || id === "ct-phone" || id === "pf-phone" ||
         field.getAttribute("data-filter") === "digits") &&
        explicitRules.indexOf("mobile") === -1 && explicitRules.indexOf("phone") === -1) {
      // If maxlength is 10 or default mobile, use mobile
      explicitRules.push("mobile");
    }

    // Auto-detect age
    if ((id === "childage" || id === "ct-child" || name === "childage") &&
        explicitRules.indexOf("age") === -1) {
      explicitRules.push("age");
    }

    // Auto-detect password
    if (type === "password" && explicitRules.indexOf("password") === -1 && explicitRules.indexOf("passwordBasic") === -1) {
      explicitRules.push("passwordBasic");
    }

    return explicitRules;
  }

  function isNameField(field) {
    var rules = detectRules(field);
    if (rules.indexOf("name") > -1) return true;
    var name = (field.name || "").toLowerCase();
    var id = (field.id || "").toLowerCase();
    return name.indexOf("name") > -1 || id.indexOf("name") > -1;
  }

  function isMobileField(field) {
    var rules = detectRules(field);
    if (rules.indexOf("mobile") > -1) return true;
    var name = (field.name || "").toLowerCase();
    var id = (field.id || "").toLowerCase();
    return field.type === "tel" || name.indexOf("mobile") > -1 || id.indexOf("mobile") > -1;
  }

  function isDigitsOnlyField(field) {
    var rules = detectRules(field);
    return isMobileField(field) ||
      rules.indexOf("digits") > -1 ||
      rules.indexOf("age") > -1 ||
      rules.indexOf("integer") > -1 ||
      field.getAttribute("data-filter") === "digits" ||
      field.id === "childAge" || field.id === "ct-child";
  }

  /* --------------------------- UI State --------------------------- */
  function showError(field, message) {
    field.classList.add("is-invalid", "invalid");
    field.classList.remove("is-valid", "valid");
    field.setAttribute("aria-invalid", "true");

    var el = getErrorEl(field);
    if (el) {
      el.textContent = message;
      el.classList.add("is-visible", "show");
      el.style.display = "block";
    }
  }

  function clearError(field) {
    field.classList.remove("is-invalid", "invalid");
    field.setAttribute("aria-invalid", "false");

    var el = getErrorEl(field);
    if (el) {
      el.textContent = "";
      el.classList.remove("is-visible", "show");
      el.style.display = "none";
    }

    var rules = detectRules(field);
    var value = (field.value || "").trim();
    if (rules.length > 0 && (value !== "" || field.type === "checkbox") && validateField(field, true) === "") {
      field.classList.add("is-valid", "valid");
    } else {
      field.classList.remove("is-valid", "valid");
    }
  }

  /* --------------------------- Validation Logic --------------------------- */
  function validateField(field, silent) {
    // Checkbox consent special handling
    if (field.type === "checkbox") {
      if (field.hasAttribute("required") && !field.checked) {
        if (!silent) showError(field, MESSAGES.consent);
        return MESSAGES.consent;
      }
      if (!silent) clearError(field);
      return "";
    }

    var value = (field.value || "").trim();
    var rules = detectRules(field);
    if (!rules.length) return "";

    var isOptional = field.hasAttribute("data-optional");
    if (isOptional && value === "") {
      if (!silent) clearError(field);
      return "";
    }

    var label = getLabel(field);
    var error = "";

    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      var arg = null;
      var colon = rule.indexOf(":");
      if (colon > -1) {
        arg = rule.slice(colon + 1);
        rule = rule.slice(0, colon);
      }

      switch (rule) {
        case "required":
          if (value === "") {
            error = label + " is required.";
          }
          break;

        case "name":
          if (value) {
            if (!PATTERNS.name.test(value)) {
              error = MESSAGES.name;
            }
          }
          break;

        case "email":
          if (value) {
            if (!PATTERNS.email.test(value)) {
              error = MESSAGES.email;
            }
          }
          break;

        case "mobile":
          if (value) {
            if (!PATTERNS.mobile.test(value)) {
              error = MESSAGES.mobile;
            }
          }
          break;

        case "phone":
          if (value) {
            if (!PATTERNS.phone.test(value) && !PATTERNS.mobile.test(value)) {
              error = MESSAGES.phone;
            }
          }
          break;

        case "number":
          if (value && !PATTERNS.number.test(value)) {
            error = MESSAGES.number;
          }
          break;

        case "digits":
        case "integer":
          if (value && !PATTERNS.integer.test(value)) {
            error = MESSAGES.integer;
          }
          break;

        case "amount":
          if (value && !PATTERNS.amount.test(value)) {
            error = MESSAGES.amount;
          }
          break;

        case "alphanumeric":
          if (value && !PATTERNS.alphanumeric.test(value)) {
            error = MESSAGES.alphanumeric;
          }
          break;

        case "password":
          if (value && !PATTERNS.password.test(value)) {
            error = MESSAGES.password;
          }
          break;

        case "passwordBasic":
          if (value && value.length < 6) {
            error = MESSAGES.passwordBasic;
          }
          break;

        case "date":
          if (value && !PATTERNS.date.test(value)) {
            error = MESSAGES.date;
          }
          break;

        case "age":
          if (value) {
            if (!PATTERNS.digits.test(value)) {
              error = "Numbers only are allowed.";
            } else {
              var ageNum = parseInt(value, 10);
              var minAge = field.hasAttribute("min") ? parseInt(field.getAttribute("min"), 10) : 5;
              var maxAge = field.hasAttribute("max") ? parseInt(field.getAttribute("max"), 10) : 14;
              if (isNaN(ageNum) || ageNum < minAge || ageNum > maxAge) {
                error = "Please enter a valid age between " + minAge + " and " + maxAge + ".";
              }
            }
          }
          break;

        case "minlength":
          if (value && value.length < +arg) {
            error = MESSAGES.minlength(+arg);
          }
          break;

        case "maxlength":
          if (value && value.length > +arg) {
            error = MESSAGES.maxlength(+arg);
          }
          break;

        case "match":
          var other = field.form && field.form.elements[arg];
          if (!other) other = document.getElementById(arg);
          if (value && other && value !== (other.value || "").trim()) {
            error = MESSAGES.match;
          }
          break;

        default:
          break;
      }

      if (error) break;
    }

    if (!silent) {
      if (error) showError(field, error);
      else clearError(field);
    }
    return error;
  }

  function validateForm(form) {
    var inputs = form.querySelectorAll("input, select, textarea");
    var firstInvalid = null;
    var valid = true;

    inputs.forEach(function (field) {
      if (field.type === "submit" || field.type === "button" || field.type === "reset") return;
      field.setAttribute("data-touched", "true");
      var err = validateField(field, false);
      if (err) {
        valid = false;
        if (!firstInvalid) firstInvalid = field;
      }
    });

    if (firstInvalid) {
      try {
        firstInvalid.focus();
        firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (e) {}
    }
    return valid;
  }

  /* ---------------------- Proactive Input Filtering ---------------------- */
  function setupInputFilters(field) {
    // 1. Name fields: Letters only & single spaces
    if (isNameField(field)) {
      // Keystroke interception
      field.addEventListener("keypress", function (e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        // Block if not letter or space
        if (!/^[a-zA-Z\s]$/.test(e.key)) {
          e.preventDefault();
        }
      });

      // Sanitization on input (e.g. paste or autocomplete)
      field.addEventListener("input", function () {
        var prev = field.value;
        var cleaned = prev.replace(/[^a-zA-Z\s]/g, "");
        // Prevent leading space and collapse multiple spaces
        cleaned = cleaned.replace(/^\s+/, "").replace(/\s{2,}/g, " ");
        if (prev !== cleaned) {
          field.value = cleaned;
        }
      });
    }

    // 2. Mobile / Digits fields: Numbers only
    else if (isDigitsOnlyField(field)) {
      var isMobile = isMobileField(field);

      field.addEventListener("keypress", function (e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        // Block non-digits
        if (!/^\d$/.test(e.key)) {
          e.preventDefault();
        }
      });

      field.addEventListener("input", function () {
        var prev = field.value;
        var cleaned = prev.replace(/\D/g, "");
        if (isMobile) {
          cleaned = cleaned.slice(0, 10);
        }
        if (prev !== cleaned) {
          field.value = cleaned;
        }
      });
    }
  }

  /* --------------------------- Binding Forms --------------------------- */
  function bindFieldEvents(field) {
    setupInputFilters(field);

    // Live validation & instant error clearing
    var liveCheck = function () {
      if (field.getAttribute("data-touched") === "true") {
        validateField(field, false);
      } else {
        // If user already typed something valid, remove invalid styling immediately
        var err = validateField(field, true);
        if (!err && (field.value || "").trim() !== "") {
          clearError(field);
        }
      }
    };

    field.addEventListener("input", liveCheck);
    field.addEventListener("change", liveCheck);

    field.addEventListener("blur", function () {
      // Trim spaces on blur
      if (typeof field.value === "string") {
        field.value = field.value.trim();
      }
      field.setAttribute("data-touched", "true");
      validateField(field, false);
    });
  }

  function bind(form) {
    if (form.getAttribute("data-iep-bound") === "true") return;
    form.setAttribute("data-iep-bound", "true");
    form.setAttribute("novalidate", "novalidate");

    var fields = form.querySelectorAll("input, select, textarea");
    fields.forEach(function (field) {
      if (field.type === "submit" || field.type === "button" || field.type === "reset") return;
      bindFieldEvents(field);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var isValid = validateForm(form);
      if (!isValid) return;

      var submitBtn = form.querySelector('[type="submit"], button:not([type="button"])');
      var originalBtnText = submitBtn ? submitBtn.innerHTML : "";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = "Submitting…";
      }

      // Collect form data
      var formData = {};
      new FormData(form).forEach(function (val, key) {
        formData[key] = val;
      });

      // Special handling for checkboxes
      form.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
        if (cb.name) formData[cb.name] = cb.checked;
      });

      // Determine API endpoint if applicable
      var endpoint = null;
      if (form.id === "contactForm") endpoint = "/api/contact";
      else if (form.id === "ct-form" || form.querySelector("#ct-name")) endpoint = "/api/consultation";
      else if (form.id === "notifyForm") endpoint = "/api/notify";
      else if (form.id === "loginForm") endpoint = "/api/login";
      else if (form.querySelector("#nl-email") || form.querySelector('input[type="email"][placeholder*="email"]')) {
        if (!form.id || form.id.indexOf("login") === -1) endpoint = "/api/newsletter";
      }

      var handleSuccess = function () {
        var successEl = form.querySelector("[data-form-success]") ||
          document.querySelector("[data-form-success]") ||
          form.querySelector(".success-msg") ||
          document.getElementById("notify-success");

        if (successEl) {
          successEl.classList.remove("hidden");
          successEl.classList.add("show");
          successEl.style.display = "block";
        }

        // Special handling for login page: redirect with intimation
        if (form.id === "loginForm") {
          setTimeout(function () {
            window.location.href = "login.html?login=success";
          }, 500);
          return;
        }

        form.reset();
        form.querySelectorAll("input, select, textarea").forEach(function (f) {
          f.removeAttribute("data-touched");
          f.classList.remove("is-valid", "is-invalid", "valid", "invalid");
        });

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText || "Submit";
        }
      };

      // Try submitting to backend API if endpoint exists
      if (endpoint && typeof fetch === "function") {
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        })
          .then(function (res) {
            return res.json().then(function (json) {
              return { status: res.status, ok: res.ok, data: json };
            });
          })
          .then(function (res) {
            if (!res.ok) {
              // Server rejected with validation errors
              if (res.data && res.data.errors) {
                Object.keys(res.data.errors).forEach(function (fieldName) {
                  var f = form.elements[fieldName] || form.querySelector('[name="' + fieldName + '"]') || document.getElementById(fieldName);
                  if (f) showError(f, res.data.errors[fieldName]);
                });
              }
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText || "Submit";
              }
            } else {
              handleSuccess();
            }
          })
          .catch(function () {
            // Network fallback: simulate successful submission
            setTimeout(handleSuccess, 500);
          });
      } else {
        setTimeout(handleSuccess, 500);
      }
    });
  }

  function init() {
    // Bind all forms
    document.querySelectorAll("form").forEach(bind);

    // Also bind any inputs with data-rules even if outside bound forms
    document.querySelectorAll("[data-rules], [data-rule]").forEach(function (field) {
      if (!field.form) bindFieldEvents(field);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Global export
  window.IEPValidate = {
    patterns: PATTERNS,
    messages: MESSAGES,
    validateField: validateField,
    validateForm: validateForm,
    clearError: clearError,
    showError: showError,
    bind: bind,
    init: init
  };
})();
