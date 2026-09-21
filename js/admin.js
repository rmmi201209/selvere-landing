(function () {
  var db = window.SELVERE_SUPABASE.createClient();
  var STATUSES = window.SELVERE_SUPABASE.statuses;

  var loginPanel = document.querySelector("#login-panel");
  var boardPanel = document.querySelector("#board-panel");
  var loginForm = document.querySelector("#login-form");
  var emailInput = document.querySelector("#admin-email");
  var passwordInput = document.querySelector("#admin-password");
  var loginError = document.querySelector("[data-login-error]");
  var boardStatus = document.querySelector("[data-board-status]");
  var boardError = document.querySelector("[data-board-error]");
  var rowsEl = document.querySelector("#inquiry-rows");
  var refreshButton = document.querySelector("#refresh-button");
  var logoutButton = document.querySelector("#logout-button");

  function showLogin() {
    loginPanel.classList.remove("hidden");
    boardPanel.classList.add("hidden");
  }

  function showBoard() {
    loginPanel.classList.add("hidden");
    boardPanel.classList.remove("hidden");
  }

  function formatTimestamp(value) {
    if (!value) return "";
    try {
      return new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      }).format(new Date(value));
    } catch (error) {
      return String(value);
    }
  }

  function renderRows(items) {
    rowsEl.innerHTML = "";
    if (!items.length) {
      boardStatus.textContent = "아직 접수된 문의가 없습니다.";
      return;
    }

    boardStatus.textContent = items.length + "건의 문의";
    items.forEach(function (item) {
      var tr = document.createElement("tr");
      tr.className = "border-t border-alabaster align-top";
      tr.dataset.id = String(item.id);

      var statusOptions = STATUSES.map(function (status) {
        var selected = status === item.status ? " selected" : "";
        return "<option value=\"" + escapeAttr(status) + "\"" + selected + ">" + escapeHtml(status) + "</option>";
      }).join("");

      tr.innerHTML =
        "<td class=\"px-3 py-3 whitespace-nowrap text-xs text-slateink\">" +
        escapeHtml(formatTimestamp(item.created_at)) +
        "</td>" +
        "<td class=\"px-3 py-3\"><p class=\"font-medium\">" +
        escapeHtml(item.name) +
        "</p><p class=\"mt-1 text-xs text-slateink\">" +
        escapeHtml(item.company) +
        "</p></td>" +
        "<td class=\"px-3 py-3 text-xs leading-6\">" +
        escapeHtml(item.phone) +
        "<br />" +
        escapeHtml(item.email) +
        "</td>" +
        "<td class=\"px-3 py-3\"><p class=\"text-xs text-amberglow\">" +
        escapeHtml(item.category) +
        "</p><p class=\"mt-1 max-w-xs whitespace-pre-wrap text-xs leading-6\">" +
        escapeHtml(item.message) +
        "</p></td>" +
        "<td class=\"px-3 py-3\"><select class=\"form-field w-36 border border-alabaster bg-ivory px-2 py-2 text-xs\" data-status>" +
        statusOptions +
        "</select></td>" +
        "<td class=\"px-3 py-3\"><textarea class=\"form-field min-h-[84px] w-52 border border-alabaster bg-ivory px-2 py-2 text-xs\" data-note>" +
        escapeHtml(item.note) +
        "</textarea></td>" +
        "<td class=\"px-3 py-3\"><button class=\"bg-charcoal px-3 py-2 text-[10px] tracking-[0.14em] uppercase text-ivory\" type=\"button\" data-save>Save</button><p class=\"mt-2 text-[11px] text-slateink\" data-save-status></p></td>";

      rowsEl.appendChild(tr);
    });
  }

  function loadList() {
    boardError.textContent = "";
    boardStatus.textContent = "목록을 불러오는 중...";
    return db
      .from("inquiries")
      .select("id, created_at, name, company, phone, email, category, message, status, note")
      .order("created_at", { ascending: false })
      .then(function (result) {
        if (result.error) {
          throw result.error;
        }
        renderRows(result.data || []);
      });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var email = emailInput.value.trim();
    var password = passwordInput.value;
    loginError.textContent = "";

    if (!email || !password) {
      loginError.textContent = "이메일과 비밀번호를 입력해 주세요.";
      return;
    }

    db.auth
      .signInWithPassword({ email: email, password: password })
      .then(function (result) {
        if (result.error) {
          throw result.error;
        }
        showBoard();
        return loadList();
      })
      .catch(function (error) {
        loginError.textContent = error.message || "로그인에 실패했습니다.";
        showLogin();
      });
  });

  refreshButton.addEventListener("click", function () {
    loadList().catch(function (error) {
      boardError.textContent = error.message;
    });
  });

  logoutButton.addEventListener("click", function () {
    db.auth.signOut().finally(function () {
      passwordInput.value = "";
      showLogin();
    });
  });

  rowsEl.addEventListener("click", function (event) {
    var button = event.target.closest("[data-save]");
    if (!button) return;

    var tr = button.closest("tr");
    var statusHint = tr.querySelector("[data-save-status]");
    var id = tr.dataset.id;

    button.disabled = true;
    statusHint.textContent = "저장 중...";
    db.from("inquiries")
      .update({
        status: tr.querySelector("[data-status]").value,
        note: tr.querySelector("[data-note]").value.trim()
      })
      .eq("id", id)
      .then(function (result) {
        if (result.error) {
          throw result.error;
        }
        statusHint.textContent = "저장됨";
      })
      .catch(function (error) {
        statusHint.textContent = error.message || "저장에 실패했습니다.";
      })
      .finally(function () {
        button.disabled = false;
      });
  });

  db.auth.getSession().then(function (result) {
    if (result.data && result.data.session) {
      showBoard();
      return loadList();
    }
    showLogin();
  });
})();
