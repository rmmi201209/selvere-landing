(function () {
  var SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbwy0EqP9kzIoUarvzWBRl7mN0vkSe2F9jVXjSrFmPsP4IGwxClPUxxI5uqVKtpxRbsj/exec";
  var TOKEN_KEY = "selvere-admin-token";

  var loginPanel = document.querySelector("#login-panel");
  var boardPanel = document.querySelector("#board-panel");
  var loginForm = document.querySelector("#login-form");
  var tokenInput = document.querySelector("#admin-token");
  var loginError = document.querySelector("[data-login-error]");
  var boardStatus = document.querySelector("[data-board-status]");
  var boardError = document.querySelector("[data-board-error]");
  var rowsEl = document.querySelector("#inquiry-rows");
  var refreshButton = document.querySelector("#refresh-button");
  var logoutButton = document.querySelector("#logout-button");

  function post(payload) {
    return fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    }).then(function (response) {
      return response.text().then(function (text) {
        try {
          return JSON.parse(text);
        } catch (error) {
          throw new Error("서버 응답을 읽지 못했습니다.");
        }
      });
    });
  }

  function showLogin() {
    loginPanel.classList.remove("hidden");
    boardPanel.classList.add("hidden");
  }

  function showBoard() {
    loginPanel.classList.add("hidden");
    boardPanel.classList.remove("hidden");
  }

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  }

  function renderRows(items, statuses) {
    rowsEl.innerHTML = "";
    if (!items.length) {
      boardStatus.textContent = "아직 접수된 문의가 없습니다.";
      return;
    }

    boardStatus.textContent = items.length + "건의 문의";
    items.forEach(function (item) {
      var tr = document.createElement("tr");
      tr.className = "border-t border-alabaster align-top";
      tr.dataset.row = String(item.row);

      var statusOptions = statuses
        .map(function (status) {
          var selected = status === item.status ? " selected" : "";
          return "<option value=\"" + escapeAttr(status) + "\"" + selected + ">" + escapeHtml(status) + "</option>";
        })
        .join("");

      tr.innerHTML =
        "<td class=\"px-3 py-3 whitespace-nowrap text-xs text-slateink\">" +
        escapeHtml(item.timestamp) +
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
    var token = getToken();
    boardError.textContent = "";
    boardStatus.textContent = "목록을 불러오는 중...";
    return post({ action: "list", token: token }).then(function (result) {
      if (!result.ok) {
        throw new Error(result.error || "목록을 불러오지 못했습니다.");
      }
      renderRows(result.items || [], result.statuses || []);
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
    var token = tokenInput.value.trim();
    loginError.textContent = "";
    if (!token) {
      loginError.textContent = "비밀번호를 입력해 주세요.";
      return;
    }

    sessionStorage.setItem(TOKEN_KEY, token);
    post({ action: "list", token: token })
      .then(function (result) {
        if (!result.ok) {
          throw new Error(result.error || "로그인에 실패했습니다.");
        }
        showBoard();
        renderRows(result.items || [], result.statuses || []);
      })
      .catch(function (error) {
        sessionStorage.removeItem(TOKEN_KEY);
        loginError.textContent = error.message;
        showLogin();
      });
  });

  refreshButton.addEventListener("click", function () {
    loadList().catch(function (error) {
      boardError.textContent = error.message;
    });
  });

  logoutButton.addEventListener("click", function () {
    sessionStorage.removeItem(TOKEN_KEY);
    tokenInput.value = "";
    showLogin();
  });

  rowsEl.addEventListener("click", function (event) {
    var button = event.target.closest("[data-save]");
    if (!button) return;

    var tr = button.closest("tr");
    var statusHint = tr.querySelector("[data-save-status]");
    var payload = {
      action: "update",
      token: getToken(),
      row: Number(tr.dataset.row),
      status: tr.querySelector("[data-status]").value,
      note: tr.querySelector("[data-note]").value.trim()
    };

    button.disabled = true;
    statusHint.textContent = "저장 중...";
    post(payload)
      .then(function (result) {
        if (!result.ok) {
          throw new Error(result.error || "저장에 실패했습니다.");
        }
        statusHint.textContent = "저장됨";
      })
      .catch(function (error) {
        statusHint.textContent = error.message;
      })
      .finally(function () {
        button.disabled = false;
      });
  });

  if (getToken()) {
    loadList()
      .then(showBoard)
      .catch(function () {
        sessionStorage.removeItem(TOKEN_KEY);
        showLogin();
      });
  }
})();
