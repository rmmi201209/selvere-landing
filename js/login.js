(function () {
  var db = window.selvereAuth.db;
  var form = document.querySelector("#login-form");
  var errorEl = document.querySelector("[data-form-error]");

  window.selvereAuth.ready.then(function (session) {
    if (session) {
      location.replace(window.selvereAuth.afterLoginPath(session));
    }
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var email = form.email.value.trim();
    var password = form.password.value;
    errorEl.textContent = "";

    if (!email || !password) {
      errorEl.textContent = "이메일과 비밀번호를 입력해 주세요.";
      return;
    }

    db.auth.signInWithPassword({ email: email, password: password }).then(function (result) {
      if (result.error) {
        throw result.error;
      }
      location.replace(window.selvereAuth.afterLoginPath(result.data.session));
    }).catch(function (error) {
      errorEl.textContent = error.message || "로그인에 실패했습니다.";
    });
  });
})();
