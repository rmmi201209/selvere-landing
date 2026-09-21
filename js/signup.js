(function () {
  var db = window.selvereAuth.db;
  var form = document.querySelector("#signup-form");
  var errorEl = document.querySelector("[data-form-error]");
  var statusEl = document.querySelector("[data-form-status]");

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var name = form.name.value.trim();
    var email = form.email.value.trim();
    var password = form.password.value;
    var confirm = form.passwordConfirm.value;
    errorEl.textContent = "";
    statusEl.textContent = "";

    if (!name || !email || !password) {
      errorEl.textContent = "이름, 이메일, 비밀번호를 입력해 주세요.";
      return;
    }
    if (password.length < 6) {
      errorEl.textContent = "비밀번호는 6자 이상이어야 합니다.";
      return;
    }
    if (password !== confirm) {
      errorEl.textContent = "비밀번호가 서로 다릅니다.";
      return;
    }

    db.auth
      .signUp({
        email: email,
        password: password,
        options: { data: { name: name } }
      })
      .then(function (result) {
        if (result.error) {
          throw result.error;
        }
        if (result.data && result.data.session) {
          location.replace("board.html");
          return;
        }
        statusEl.textContent = "가입이 접수되었습니다. 이메일 확인이 켜져 있으면 받은편지함을 확인해 주세요. 확인 후 로그인하면 게시판을 쓸 수 있습니다.";
        form.reset();
      })
      .catch(function (error) {
        var message = error.message || "회원가입에 실패했습니다.";
        if (/signups? not allowed/i.test(message) || /user signups are disabled/i.test(message)) {
          message = "Supabase에서 회원가입이 꺼져 있습니다. Authentication → Providers → Email에서 Allow new users to sign up을 켜 주세요.";
        }
        errorEl.textContent = message;
      });
  });
})();
