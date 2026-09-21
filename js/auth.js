(function (window) {
  var db = window.SELVERE_SUPABASE.createClient();
  var sessionReady = db.auth.getSession().then(function (result) {
    var session = result.data && result.data.session;
    window.__selvereSession = session || null;
    renderAuth(session);
    return session;
  });

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function safeNext(value) {
    if (!value) return "board.html";
    if (/^https?:/i.test(value) || value.indexOf("//") === 0) return "board.html";
    return value;
  }

  function currentPage() {
    return (location.pathname.split("/").pop() || "index.html") + location.search;
  }

  function inboundNavLink(extraClass) {
    return (
      '<a class="' +
      extraClass +
      '" href="admin.html">Inbound</a>'
    );
  }

  function hasScope(session, scope) {
    var roles = window.SELVERE_SUPABASE.adminRoles || {};
    var email = session && session.user && session.user.email
      ? String(session.user.email).toLowerCase()
      : "";
    return (roles[email] || []).indexOf(scope) !== -1;
  }

  function isInboundOnly(session) {
    return hasScope(session, "inbound") && !hasScope(session, "board");
  }

  function isBoardHref(href) {
    return /(?:^|\/)(board\.html|board-write\.html|post\.html)/i.test(href || "");
  }

  function afterLoginPath(session) {
    var requested = new URLSearchParams(location.search).get("next");
    var path = requested ? safeNext(requested) : "";
    var inbound = hasScope(session, "inbound");

    if (isInboundOnly(session) || (isBoardHref(path) && inbound && !hasScope(session, "board"))) {
      return "admin.html";
    }
    if (path.indexOf("admin.html") === 0) {
      return inbound ? "admin.html" : "board.html";
    }
    if (path) {
      return path;
    }
    if (inbound) {
      return "admin.html";
    }
    return "board.html";
  }

  function renderAuth(session) {
    var inbound = hasScope(session, "inbound");
    var inboundOnly = isInboundOnly(session);

    document.querySelectorAll("[data-board-nav]").forEach(function (el) {
      el.hidden = inboundOnly;
    });

    document.querySelectorAll("[data-admin-nav]").forEach(function (slot) {
      slot.hidden = !inbound;
      slot.innerHTML = inbound
        ? inboundNavLink(slot.getAttribute("data-admin-nav") || "nav-link transition hover:text-amberglow")
        : "";
    });

    document.querySelectorAll("[data-auth-slot]").forEach(function (slot) {
      if (session) {
        slot.innerHTML =
          '<span class="auth-email">' +
          escapeHtml(session.user.email || "") +
          "</span>" +
          (inbound ? inboundNavLink("header-auth-btn is-fill") : "") +
          '<button class="header-auth-btn" type="button" data-logout>Logout</button>';
      } else {
        slot.innerHTML =
          '<a class="header-auth-btn" href="signup.html">Join</a>' +
          '<a class="header-auth-btn is-fill" href="login.html">Login</a>';
      }
    });

    document.querySelectorAll("[data-logout]").forEach(function (button) {
      button.addEventListener("click", function () {
        db.auth.signOut().then(function () {
          location.href = "index.html";
        });
      });
    });
  }

  document.addEventListener(
    "click",
    function (event) {
      var link = event.target.closest("a[href]");
      if (!link) return;

      if (isInboundOnly(window.__selvereSession) && isBoardHref(link.getAttribute("href"))) {
        event.preventDefault();
        location.href = "admin.html";
        return;
      }

      if (!link.hasAttribute("data-requires-auth")) return;
      if (window.__selvereSession) return;
      event.preventDefault();
      location.href = "login.html?next=" + encodeURIComponent(link.getAttribute("href") || "board.html");
    },
    true
  );

  window.selvereAuth = {
    db: db,
    ready: sessionReady,
    requireSession: function () {
      return sessionReady.then(function (session) {
        if (session) return session;
        location.replace("login.html?next=" + encodeURIComponent(currentPage()));
        return null;
      });
    },
    requireBoardAccess: function () {
      return sessionReady.then(function (session) {
        if (!session) {
          location.replace("login.html?next=" + encodeURIComponent(currentPage()));
          return null;
        }
        if (isInboundOnly(session)) {
          location.replace("admin.html");
          return null;
        }
        return session;
      });
    },
    nextPath: function () {
      return safeNext(new URLSearchParams(location.search).get("next"));
    },
    afterLoginPath: afterLoginPath,
    displayName: function (user) {
      var meta = (user && user.user_metadata) || {};
      return meta.name || meta.full_name || (user && user.email ? user.email.split("@")[0] : "회원");
    },
    adminEmailOf: function (session) {
      return session && session.user && session.user.email
        ? String(session.user.email).toLowerCase()
        : "";
    },
    adminScopes: function (session) {
      var roles = (window.SELVERE_SUPABASE.adminRoles || {});
      return roles[this.adminEmailOf(session)] || [];
    },
    hasAdminScope: function (session, scope) {
      return this.adminScopes(session).indexOf(scope) !== -1;
    },
    isAdmin: function (session) {
      return this.adminScopes(session).length > 0;
    },
    isInboundAdmin: function (session) {
      return this.hasAdminScope(session, "inbound");
    },
    isInboundOnly: isInboundOnly,
    isBoardAdmin: function (session) {
      return this.hasAdminScope(session, "board");
    }
  };
})(window);
