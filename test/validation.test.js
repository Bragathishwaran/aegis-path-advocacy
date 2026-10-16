/**
 * Automated Test Suite for Form Input Validation
 * Tests both unit validator functions and backend endpoints
 */

const assert = require("assert");
const http = require("http");
const {
  validateName,
  validateMobile,
  validateEmail,
  validateAge,
  validateContactForm,
  validateConsultationForm,
  validateNewsletter,
  validateLogin,
  validateProfile
} = require("../api/validator");
const server = require("../server");

console.log("=================================================");
console.log("Running Form Input Validation Test Suite");
console.log("=================================================\n");

let passedCount = 0;
let totalCount = 0;

function runTest(description, fn) {
  totalCount++;
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(`    ${err.message}`);
  }
}

// ---------------- 1. Name Fields ----------------
console.log("--- 1. Name Field Tests ---");
runTest("Valid name: 'Ranjith'", () => {
  assert.strictEqual(validateName("Ranjith"), null);
});

runTest("Valid name: 'Ranjith Kumar'", () => {
  assert.strictEqual(validateName("Ranjith Kumar"), null);
});

runTest("Valid name: 'Sri Devi'", () => {
  assert.strictEqual(validateName("Sri Devi"), null);
});

runTest("Invalid name with numbers: 'Ranjith123'", () => {
  assert.notStrictEqual(validateName("Ranjith123"), null);
});

runTest("Invalid name all digits: '12345'", () => {
  assert.notStrictEqual(validateName("12345"), null);
});

runTest("Invalid name with special characters: 'Ranjith@123'", () => {
  assert.notStrictEqual(validateName("Ranjith@123"), null);
});

runTest("Empty required name field", () => {
  assert.strictEqual(validateName("", "Full Name", true), "Full Name is required.");
  assert.strictEqual(validateName("   ", "Full Name", true), "Full Name is required.");
});

// ---------------- 2. Mobile / Number Fields ----------------
console.log("\n--- 2. Number / Mobile Field Tests ---");
runTest("Valid mobile number: '9876543210' (10 digits)", () => {
  assert.strictEqual(validateMobile("9876543210"), null);
});

runTest("Invalid mobile with alphabets: '98765abc10'", () => {
  assert.notStrictEqual(validateMobile("98765abc10"), null);
});

runTest("Invalid mobile too short (9 digits): '987654321'", () => {
  assert.notStrictEqual(validateMobile("987654321"), null);
});

runTest("Invalid mobile too long (11 digits): '98765432100'", () => {
  assert.notStrictEqual(validateMobile("98765432100"), null);
});

runTest("Empty required mobile field", () => {
  assert.strictEqual(validateMobile("", "Mobile number", true), "Mobile number is required.");
});

runTest("Valid child age: '8' (between 5 and 14)", () => {
  assert.strictEqual(validateAge("8", 5, 14), null);
});

runTest("Valid child age boundary: minimum '5'", () => {
  assert.strictEqual(validateAge("5", 5, 14), null);
});

runTest("Valid child age boundary: maximum '14'", () => {
  assert.strictEqual(validateAge("14", 5, 14), null);
});

runTest("Invalid child age with letters: '8yrs'", () => {
  assert.notStrictEqual(validateAge("8yrs", 5, 14), null);
});

runTest("Invalid child age out of range (below 5): '4'", () => {
  assert.notStrictEqual(validateAge("4", 5, 14), null);
});

runTest("Invalid child age out of range (above 14): '15'", () => {
  assert.notStrictEqual(validateAge("15", 5, 14), null);
});

// ---------------- 3. Email Fields ----------------
console.log("\n--- 3. Email Field Tests ---");
runTest("Valid email: 'ranjith@gmail.com'", () => {
  assert.strictEqual(validateEmail("ranjith@gmail.com"), null);
});

runTest("Valid email: 'user@example.com'", () => {
  assert.strictEqual(validateEmail("user@example.com"), null);
});

runTest("Invalid email without @: 'ranjithgmail.com'", () => {
  assert.notStrictEqual(validateEmail("ranjithgmail.com"), null);
});

runTest("Invalid email with @ but no domain: 'ranjith@'", () => {
  assert.notStrictEqual(validateEmail("ranjith@"), null);
});

runTest("Invalid email without username: '@gmail.com'", () => {
  assert.notStrictEqual(validateEmail("@gmail.com"), null);
});

runTest("Invalid email without TLD/domain dot: 'ranjith@gmail'", () => {
  assert.notStrictEqual(validateEmail("ranjith@gmail"), null);
});

runTest("Empty required email field", () => {
  assert.strictEqual(validateEmail("", "Email Address", true), "Email Address is required.");
});

// ---------------- 4. Form Submissions (Valid & Invalid) ----------------
console.log("\n--- 4. Form Submission Tests ---");
runTest("Valid Contact Form Submission", () => {
  const result = validateContactForm({
    fullName: "Ranjith Kumar",
    email: "ranjith@gmail.com",
    mobile: "9876543210",
    childAge: "8",
    helpType: "iep-review",
    bestTime: "morning",
    message: "We need comprehensive assistance with an IEP review meeting.",
    consent: true
  });
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(Object.keys(result.errors).length, 0);
});

runTest("Invalid Contact Form Submission (all fields invalid/empty)", () => {
  const result = validateContactForm({
    fullName: "Ranjith123",
    email: "ranjithgmail.com",
    mobile: "98765abc10",
    childAge: "35",
    helpType: "",
    bestTime: "",
    message: "Short",
    consent: false
  });
  assert.strictEqual(result.isValid, false);
  assert.ok(result.errors.fullName, "fullName error should exist");
  assert.ok(result.errors.email, "email error should exist");
  assert.ok(result.errors.mobile, "mobile error should exist");
  assert.ok(result.errors.childAge, "childAge error should exist");
  assert.ok(result.errors.message, "message error should exist");
  assert.ok(result.errors.consent, "consent error should exist");
});

runTest("Valid Consultation Form Submission (Index)", () => {
  const result = validateConsultationForm({
    parentName: "Sri Devi",
    email: "user@example.com",
    mobile: "9876543210",
    childAge: "9",
    message: "Requesting guidance regarding our school district 504 evaluation."
  });
  assert.strictEqual(result.isValid, true);
});

runTest("Invalid Consultation Form with empty fields", () => {
  const result = validateConsultationForm({});
  assert.strictEqual(result.isValid, false);
  assert.ok(result.errors.parentName);
  assert.ok(result.errors.email);
  assert.ok(result.errors.mobile);
  assert.ok(result.errors.childAge);
  assert.ok(result.errors.message);
});

runTest("Valid Newsletter Form Submission", () => {
  const result = validateNewsletter({ email: "ranjith@gmail.com" });
  assert.strictEqual(result.isValid, true);
});

runTest("Invalid Newsletter Form Submission without @", () => {
  const result = validateNewsletter({ email: "ranjithgmail.com" });
  assert.strictEqual(result.isValid, false);
  assert.ok(result.errors.email);
});

runTest("Valid Login Submission", () => {
  const result = validateLogin({ email: "user@example.com", password: "Password123" });
  assert.strictEqual(result.isValid, true);
});

runTest("Invalid Login Submission with invalid email & short password", () => {
  const result = validateLogin({ email: "user@", password: "123" });
  assert.strictEqual(result.isValid, false);
  assert.ok(result.errors.loginEmail);
  assert.ok(result.errors.loginPassword);
});

// ---------------- 5. Backend HTTP API Tests ----------------
console.log("\n--- 5. Backend HTTP API Tests ---");
const TEST_PORT = 3199;

server.listen(TEST_PORT, () => {
  function makeRequest(path, data) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(data);
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port: TEST_PORT,
          path,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload)
          }
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            try {
              resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
            } catch (e) {
              resolve({ statusCode: res.statusCode, raw: body });
            }
          });
        }
      );
      req.on("error", reject);
      req.write(payload);
      req.end();
    });
  }

  async function runHttpTests() {
    try {
      // Test 1: Contact API Valid Submission
      totalCount++;
      const validContactRes = await makeRequest("/api/contact", {
        fullName: "Ranjith Kumar",
        email: "ranjith@gmail.com",
        mobile: "9876543210",
        childAge: "8",
        helpType: "iep-review",
        bestTime: "morning",
        message: "Need support for an upcoming triennial evaluation meeting.",
        consent: true
      });
      assert.strictEqual(validContactRes.statusCode, 200);
      assert.strictEqual(validContactRes.body.success, true);
      console.log("  ✓ Backend API: POST /api/contact valid submission returns 200 OK");
      passedCount++;

      // Test 2: Contact API Invalid Submission (rejects bad data)
      totalCount++;
      const invalidContactRes = await makeRequest("/api/contact", {
        fullName: "Ranjith123",
        email: "ranjith@gmail",
        mobile: "98765abc10",
        childAge: "50",
        message: "too short",
        consent: false
      });
      assert.strictEqual(invalidContactRes.statusCode, 400);
      assert.strictEqual(invalidContactRes.body.success, false);
      assert.ok(invalidContactRes.body.errors.fullName);
      assert.ok(invalidContactRes.body.errors.email);
      assert.ok(invalidContactRes.body.errors.mobile);
      console.log("  ✓ Backend API: POST /api/contact invalid submission returns 400 Bad Request with field errors");
      passedCount++;

      // Test 3: Newsletter API Valid & Invalid
      totalCount++;
      const validNlRes = await makeRequest("/api/newsletter", { email: "ranjith@gmail.com" });
      assert.strictEqual(validNlRes.statusCode, 200);
      assert.strictEqual(validNlRes.body.success, true);
      console.log("  ✓ Backend API: POST /api/newsletter valid email returns 200 OK");
      passedCount++;

      totalCount++;
      const invalidNlRes = await makeRequest("/api/newsletter", { email: "ranjithgmail.com" });
      assert.strictEqual(invalidNlRes.statusCode, 400);
      assert.strictEqual(invalidNlRes.body.success, false);
      console.log("  ✓ Backend API: POST /api/newsletter invalid email (no @) returns 400 Bad Request");
      passedCount++;

      console.log("\n=================================================");
      console.log(`Test Results: ${passedCount}/${totalCount} tests passed!`);
      console.log("=================================================\n");
    } catch (e) {
      console.error("HTTP test failed:", e);
    } finally {
      server.close(() => {
        if (passedCount === totalCount) {
          process.exit(0);
        } else {
          process.exit(1);
        }
      });
    }
  }

  runHttpTests();
});
