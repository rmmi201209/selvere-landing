(function () {
  var db = window.selvereAuth.db;
  var form = document.querySelector("#write-form");
  var errorEl = document.querySelector("[data-form-error]");
  var submitButton = form.querySelector('button[type="submit"]');

  function koreanError(error) {
    var message = (error && error.message) || "글을 저장하지 못했습니다.";
    if (/could not find the table/i.test(message) || /schema cache/i.test(message) || /relation .*posts/i.test(message)) {
      return "posts 테이블이 없습니다. Supabase SQL Editor에서 board.sql을 실행해 주세요.";
    }
    if (/row-level security/i.test(message) || /permission denied/i.test(message)) {
      return "글 저장 권한이 없습니다. 로그인 상태와 board.sql 실행 여부를 확인해 주세요.";
    }
    return message;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var title = form.title.value.trim();
    var body = form.body.value.trim();
    errorEl.textContent = "";

    if (!title || !body) {
      errorEl.textContent = "제목과 내용을 입력해 주세요.";
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Saving...";

    window.selvereAuth.ready
      .then(function (session) {
        if (!session) {
          location.replace("login.html?next=board-write.html");
          return null;
        }
        if (window.selvereAuth.isInboundOnly(session)) {
          location.replace("admin.html");
          return null;
        }
        return db
          .from("posts")
          .insert({
            author_id: session.user.id,
            author_name: window.selvereAuth.displayName(session.user),
            title: title,
            body: body
          })
          .select("id")
          .single()
          .then(function (result) {
            if (result.error) {
              throw result.error;
            }
            location.replace("post.html?id=" + encodeURIComponent(result.data.id));
          });
      })
      .catch(function (error) {
        errorEl.textContent = koreanError(error);
        submitButton.disabled = false;
        submitButton.textContent = "Publish";
      });
  });

  window.selvereAuth.requireBoardAccess();
})();
