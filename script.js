/* =========================================================
   MindScore — Application logic
   ========================================================= */

// Change this if your FastAPI backend runs somewhere else.
const API_URL = "https://mind-score-prediction.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();

  initMobileNav();
  initAssessmentFlow();
});

/* ---------------------------------------------------------
   Mobile navigation
--------------------------------------------------------- */
function initMobileNav() {
  const header = document.querySelector(".site-header");
  const toggle = document.getElementById("navToggle");
  const mobileNav = document.getElementById("mobileNav");

  toggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("nav-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  mobileNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      header.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* ---------------------------------------------------------
   Assessment flow
--------------------------------------------------------- */
function initAssessmentFlow() {
  const introPanel = document.getElementById("introPanel");
  const formPanel = document.getElementById("formPanel");
  const loadingPanel = document.getElementById("loadingPanel");
  const resultPanel = document.getElementById("resultPanel");
  const apiErrorPanel = document.getElementById("apiErrorPanel");

  const beginBtn = document.getElementById("beginBtn");
  const startAssessmentBtn = document.getElementById("startAssessmentBtn");
  const form = document.getElementById("assessmentForm");
  const stepFieldsets = Array.from(document.querySelectorAll(".step-fieldset"));
  const stepNodes = Array.from(document.querySelectorAll(".step-node"));
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const submitBtn = document.getElementById("submitBtn");
  const formError = document.getElementById("formError");

  const totalSteps = stepFieldsets.length;
  let currentStep = 1;
  let isSubmitting = false;

  const panels = { introPanel, formPanel, loadingPanel, resultPanel, apiErrorPanel };
  function showPanel(name) {
    Object.entries(panels).forEach(([key, el]) => {
      el.classList.toggle("hidden", key !== name);
    });
  }

  function goToAssessment() {
    showPanel("formPanel");
    document.getElementById("assessment").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  beginBtn.addEventListener("click", goToAssessment);
  startAssessmentBtn.addEventListener("click", (e) => {
    // Let the anchor scroll happen, then open the form after intro is visible.
    setTimeout(goToAssessment, 150);
  });

  /* -------- Sliders: keep numeric readout in sync -------- */
  const sliderConfigs = [
    { input: "usageHours", output: "usageHoursOut" },
    { input: "studyHours", output: "studyHoursOut" },
    { input: "activityHours", output: "activityHoursOut" },
    { input: "sleepHours", output: "sleepHoursOut" },
  ];
  sliderConfigs.forEach(({ input, output }) => {
    const inputEl = document.getElementById(input);
    const outputEl = document.getElementById(output);
    const sync = () => { outputEl.textContent = formatHours(inputEl.value); };
    inputEl.addEventListener("input", sync);
    sync();
  });
  function formatHours(value) {
    const n = Number(value);
    return Number.isInteger(n) ? `${n}h` : `${n}h`;
  }

  /* -------- Stress level pill group -------- */
  const stressPills = Array.from(document.querySelectorAll(".pill"));
  const stressHidden = document.getElementById("stressLevel");
  stressPills.forEach((pill) => {
    pill.setAttribute("aria-pressed", "false");
    pill.addEventListener("click", () => {
      stressPills.forEach((p) => p.setAttribute("aria-pressed", "false"));
      pill.setAttribute("aria-pressed", "true");
      stressHidden.value = pill.dataset.value;
      clearFieldError("stressLevel");
    });
  });

  /* -------- Step navigation -------- */
  function renderStep() {
    stepFieldsets.forEach((fs) => {
      fs.classList.toggle("hidden", Number(fs.dataset.step) !== currentStep);
    });
    stepNodes.forEach((node) => {
      const stepNum = Number(node.dataset.step);
      node.classList.toggle("active", stepNum === currentStep);
      node.classList.toggle("completed", stepNum < currentStep);
    });
    prevBtn.disabled = currentStep === 1;
    nextBtn.classList.toggle("hidden", currentStep === totalSteps);
    submitBtn.classList.toggle("hidden", currentStep !== totalSteps);
    formError.textContent = "";
  }

  prevBtn.addEventListener("click", () => {
    if (currentStep > 1) {
      currentStep -= 1;
      renderStep();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        currentStep += 1;
        renderStep();
      }
    }
  });

  /* -------- Validation -------- */
  const fieldValidators = {
    1: [
      () => validateNumberField("age", 10, 100, "Age must be between 10 and 100."),
      () => validateRequiredSelect("gender", "Please select your gender."),
      () => validateCountry(),
      () => validateRequiredSelect("academicLevel", "Please select your academic level."),
    ],
    2: [
      () => validateRequiredSelect("platform", "Please select your most used platform."),
      () => validateRequiredSelect("purpose", "Please select a purpose of use."),
      () => validateNumberField("usageHours", 0, 24, "Daily usage hours must be between 0 and 24."),
      () => validateNumberField("dailyUnlocks", 0, Infinity, "Daily unlocks must be 0 or greater."),
    ],
    3: [
      () => validateNumberField("studyHours", 0, 24, "Study hours must be between 0 and 24."),
      () => validateNumberField("activityHours", 0, 24, "Physical activity hours must be between 0 and 24."),
      () => validateNumberField("sleepHours", 0, 24, "Sleep hours must be between 0 and 24."),
      () => validateStress(),
    ],
  };

  function validateStep(step) {
    const validators = fieldValidators[step] || [];
    let allValid = true;
    let firstInvalid = null;
    validators.forEach((fn) => {
      const result = fn();
      if (!result.valid) {
        allValid = false;
        if (!firstInvalid) firstInvalid = result;
      }
    });
    formError.textContent = allValid ? "" : "Please complete all required fields correctly before continuing.";
    if (firstInvalid && firstInvalid.el) {
      firstInvalid.el.focus();
    }
    return allValid;
  }

  function setFieldError(fieldId, message) {
    const errorEl = document.getElementById(`${fieldId}Error`);
    if (errorEl) errorEl.textContent = message || "";
  }
  function clearFieldError(fieldId) {
    setFieldError(fieldId, "");
  }

  function validateNumberField(id, min, max, message) {
    const el = document.getElementById(id);
    const raw = el.value.trim();
    const num = Number(raw);
    const valid = raw !== "" && !Number.isNaN(num) && num >= min && num <= max;
    setFieldError(id, valid ? "" : message);
    return { valid, el };
  }

  function validateRequiredSelect(id, message) {
    const el = document.getElementById(id);
    const valid = el.value !== "" && el.value != null;
    setFieldError(id, valid ? "" : message);
    return { valid, el };
  }

  function validateCountry() {
    const el = document.getElementById("country");
    const valid = el.value.trim().length > 0;
    setFieldError("country", valid ? "" : "Please enter your country.");
    return { valid, el };
  }

  function validateStress() {
    const valid = stressHidden.value !== "";
    setFieldError("stressLevel", valid ? "" : "Please select your stress level.");
    return { valid, el: stressPills[0] };
  }

  /* -------- Submit -------- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validateStep(3)) return;

    // Re-validate everything, in case the user navigated back and changed something.
    const allValid = [1, 2, 3].every((step) => validateStep(step));
    if (!allValid) {
      currentStep = 1;
      renderStep();
      validateStep(1);
      return;
    }

    const payload = collectPayload();
    isSubmitting = true;
    submitBtn.disabled = true;
    showPanel("loadingPanel");

    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 422) {
        throw { type: "validation" };
      }
      if (!response.ok) {
        throw { type: "server" };
      }

      const data = await response.json();
      showResult(data.predicted_mental_health_score);
    } catch (err) {
      handleApiError(err);
    } finally {
      isSubmitting = false;
      submitBtn.disabled = false;
    }
  });

  function collectPayload() {
    return {
      age: Number(document.getElementById("age").value),
      gender: document.getElementById("gender").value,
      country: document.getElementById("country").value.trim(),
      academic_level: document.getElementById("academicLevel").value,
      most_used_platform: document.getElementById("platform").value,
      purpose_of_use: document.getElementById("purpose").value,
      avg_daily_usage_hours: Number(document.getElementById("usageHours").value),
      daily_unlocks: Number(document.getElementById("dailyUnlocks").value),
      study_hours: Number(document.getElementById("studyHours").value),
      physical_activity_hours: Number(document.getElementById("activityHours").value),
      sleep_hours_per_night: Number(document.getElementById("sleepHours").value),
      stress_level: stressHidden.value,
    };
  }

  function showResult(score) {
    showPanel("resultPanel");
    const scoreValueEl = document.getElementById("scoreValue");
    const ringFill = document.getElementById("ringFill");

    scoreValueEl.textContent = typeof score === "number" ? score.toFixed(2) : String(score);

    // Purely decorative reveal animation — the ring fill is NOT scaled to any
    // assumed score range, since the model does not define one.
    const circumference = 578; // 2 * pi * r(92), matches the CSS dasharray
    requestAnimationFrame(() => {
      ringFill.style.strokeDashoffset = String(circumference * 0.08);
    });
  }

  function handleApiError(err) {
    let message;
    if (err && err.type === "validation") {
      message = "Some information is invalid. Please review your answers.";
    } else if (err instanceof TypeError || (err && err.message === "Failed to fetch")) {
      message = "Unable to connect to the prediction server. Please make sure the FastAPI backend is running and try again.";
    } else if (err && err.type === "server") {
      message = "Something went wrong while generating your prediction. Please try again.";
    } else {
      message = "Unable to connect to the prediction server. Please make sure the FastAPI backend is running and try again.";
    }
    document.getElementById("apiErrorMessage").textContent = message;
    showPanel("apiErrorPanel");
  }

  document.getElementById("retryBtn").addEventListener("click", () => {
    showPanel("formPanel");
  });

  document.getElementById("retakeBtn").addEventListener("click", () => {
    resetForm();
    showPanel("formPanel");
  });

  document.getElementById("printBtn").addEventListener("click", () => {
    window.print();
  });

  function resetForm() {
    form.reset();
    stressPills.forEach((p) => p.setAttribute("aria-pressed", "false"));
    stressHidden.value = "";
    sliderConfigs.forEach(({ input, output }) => {
      document.getElementById(output).textContent = formatHours(document.getElementById(input).value);
    });
    document.querySelectorAll(".field-error").forEach((el) => (el.textContent = ""));
    formError.textContent = "";
    currentStep = 1;
    renderStep();
    document.getElementById("ringFill").style.strokeDashoffset = "578";
  }

  // Initial render
  renderStep();
}
