(function () {
  var header = document.querySelector(".site-header");
  var menuToggle = document.querySelector(".menu-toggle");
  var mobileNav = document.querySelector(".mobile-nav");
  var form = document.querySelector("#inquiry-form");
  var successCard = document.querySelector("#inquiry-success");
  var counters = document.querySelectorAll("[data-counter]");
  var animated = false;

  function syncHeader() {
    if (!header) return;
    var shouldSolid = window.scrollY > 24 || (mobileNav && !mobileNav.classList.contains("hidden"));
    header.classList.toggle("is-solid", shouldSolid);
  }

  window.addEventListener("scroll", syncHeader, { passive: true });
  syncHeader();

  if (menuToggle && mobileNav) {
    menuToggle.addEventListener("click", function () {
      var open = mobileNav.classList.toggle("hidden");
      menuToggle.setAttribute("aria-expanded", open ? "false" : "true");
      syncHeader();
    });

    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mobileNav.classList.add("hidden");
        menuToggle.setAttribute("aria-expanded", "false");
        syncHeader();
      });
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      var id = link.getAttribute("href");
      if (!id || id === "#") return;
      var target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  function animateCounters() {
    if (animated) return;
    animated = true;

    counters.forEach(function (el) {
      var end = parseFloat(el.getAttribute("data-counter"));
      var decimals = el.getAttribute("data-decimals") ? parseInt(el.getAttribute("data-decimals"), 10) : 0;
      var prefix = el.getAttribute("data-prefix") || "";
      var suffix = el.getAttribute("data-suffix") || "";
      var duration = 1400;
      var start = null;

      function step(timestamp) {
        if (!start) start = timestamp;
        var progress = Math.min((timestamp - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var value = end * eased;
        el.textContent = prefix + value.toFixed(decimals) + suffix;
        if (progress < 1) {
          requestAnimationFrame(step);
        }
      }

      requestAnimationFrame(step);
    });
  }

  if (counters.length && "IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCounters();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(document.querySelector("#science"));
  } else if (counters.length) {
    animateCounters();
  }

  function setError(input, message) {
    var wrap = input.closest("[data-field]");
    var hint = wrap ? wrap.querySelector(".field-error") : null;
    input.classList.toggle("border-red-400", Boolean(message));
    if (hint) {
      hint.textContent = message || "";
    }
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function isPhone(value) {
    return /^[0-9+\-\s]{8,20}$/.test(value);
  }

  var SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbwy0EqP9kzIoUarvzWBRl7mN0vkSe2F9jVXjSrFmPsP4IGwxClPUxxI5uqVKtpxRbsj/exec";

  function showSuccess() {
    form.reset();
    form.classList.add("is-hidden");
    if (successCard) {
      successCard.classList.add("is-visible");
      successCard.focus();
    }
  }

  if (form) {
    var submitButton = form.querySelector('button[type="submit"]');
    var submitError = form.querySelector("[data-submit-error]");

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var payload = {
        clientName: form.clientName.value.trim(),
        company: form.company.value.trim(),
        phone: form.phone.value.trim(),
        email: form.email.value.trim(),
        inquiryType: form.inquiryType.value,
        message: form.message.value.trim(),
        privacyConsent: form.privacyConsent.checked
      };

      var valid = true;

      setError(form.clientName, payload.clientName ? "" : "이름을 입력해 주세요.");
      if (!payload.clientName) valid = false;

      setError(form.company, payload.company ? "" : "회사명을 입력해 주세요.");
      if (!payload.company) valid = false;

      setError(form.phone, isPhone(payload.phone) ? "" : "연락처를 올바르게 입력해 주세요.");
      if (!isPhone(payload.phone)) valid = false;

      setError(form.email, isEmail(payload.email) ? "" : "이메일을 올바르게 입력해 주세요.");
      if (!isEmail(payload.email)) valid = false;

      setError(form.inquiryType, payload.inquiryType ? "" : "문의 유형을 선택해 주세요.");
      if (!payload.inquiryType) valid = false;

      setError(form.message, payload.message ? "" : "문의 내용을 입력해 주세요.");
      if (!payload.message) valid = false;

      var consentError = form.querySelector("[data-consent-error]");
      if (!payload.privacyConsent) {
        valid = false;
        if (consentError) consentError.textContent = "개인정보 수집에 동의해 주세요.";
      } else if (consentError) {
        consentError.textContent = "";
      }

      if (!valid) return;

      if (submitError) submitError.textContent = "";
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Sending...";
      }

      fetch(SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          if (response.type === "opaque") {
            return { ok: true };
          }
          return response.text().then(function (text) {
            try {
              return JSON.parse(text);
            } catch (error) {
              return { ok: response.ok };
            }
          });
        })
        .then(function (result) {
          if (result && result.ok === false) {
            throw new Error(result.error || "접수에 실패했습니다.");
          }
          showSuccess();
        })
        .catch(function () {
          if (submitError) {
            submitError.textContent = "접수에 실패했습니다. 잠시 후 다시 시도해 주세요.";
          }
        })
        .finally(function () {
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "Send Inquiry";
          }
        });
    });
  }
})();
