(function () {
  var db = window.selvereAuth.db;
  var statusEl = document.querySelector("[data-post-status]");
  var article = document.querySelector("#post-article");
  var deleteButton = document.querySelector("[data-delete-post]");
  var replyForm = document.querySelector("#reply-form");
  var replyList = document.querySelector("[data-reply-list]");
  var replyEmpty = document.querySelector("[data-reply-empty]");
  var replyError = document.querySelector("[data-reply-error]");
  var aiReplyButton = document.querySelector("[data-ai-reply]");
  var id = new URLSearchParams(location.search).get("id");
  var currentPost = null;
  var currentReplies = [];

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(value) {
    if (!value) return "";
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(new Date(value));
  }

  function renderReplies(items, isAdmin) {
    replyList.innerHTML = "";
    if (!items.length) {
      replyEmpty.classList.remove("hidden");
      return;
    }
    replyEmpty.classList.add("hidden");
    items.forEach(function (item) {
      var wrap = document.createElement("div");
      wrap.className = "border border-alabaster bg-surface px-4 py-4";
      wrap.innerHTML =
        '<div class="flex items-start justify-between gap-3">' +
        '<p class="text-[11px] tracking-[0.14em] uppercase text-amberglow">' +
        escapeHtml(item.author_name || "관리자") +
        " · " +
        escapeHtml(formatDate(item.created_at)) +
        "</p>" +
        (isAdmin
          ? '<button class="text-[10px] tracking-[0.12em] uppercase text-slateink" type="button" data-delete-reply="' +
            escapeHtml(item.id) +
            '">답글 삭제</button>'
          : "") +
        "</div>" +
        '<p class="mt-3 whitespace-pre-wrap text-sm leading-7">' +
        escapeHtml(item.body) +
        "</p>";
      replyList.appendChild(wrap);
    });
  }

  function loadReplies(isAdmin) {
    return db
      .from("post_replies")
      .select("id, created_at, author_name, body")
      .eq("post_id", id)
      .order("created_at", { ascending: true })
      .then(function (result) {
        if (result.error) {
          throw result.error;
        }
        renderReplies(result.data || [], isAdmin);
        currentReplies = result.data || [];
      });
  }

  window.selvereAuth.requireBoardAccess().then(function (session) {
    if (!session) return;
    if (!id) {
      statusEl.textContent = "글 주소가 올바르지 않습니다.";
      return;
    }

    var isAdmin = window.selvereAuth.isBoardAdmin(session);

    return db
      .from("posts")
      .select("id, created_at, author_name, title, body")
      .eq("id", id)
      .single()
      .then(function (result) {
        if (result.error) {
          throw result.error;
        }
        var post = result.data;
        currentPost = post;
        statusEl.classList.add("hidden");
        article.classList.remove("hidden");
        document.querySelector("[data-post-title]").textContent = post.title;
        document.querySelector("[data-post-body]").textContent = post.body;
        document.querySelector("[data-post-meta]").textContent =
          post.author_name + " · " + formatDate(post.created_at);
        document.title = post.title + " — SELVÈRE";

        if (isAdmin) {
          deleteButton.classList.remove("hidden");
          replyForm.classList.remove("hidden");
        }

        return loadReplies(isAdmin);
      })
      .then(function () {
        if (!isAdmin) return;

        aiReplyButton.addEventListener("click", function () {
          if (!currentPost) return;
          aiReplyButton.disabled = true;
          replyError.textContent = "";
          var original = aiReplyButton.textContent;
          aiReplyButton.textContent = "작성 중...";
          window.selvereAi
            .draft(session, "board-reply", {
              title: currentPost.title,
              body: currentPost.body,
              authorName: currentPost.author_name,
              replies: currentReplies.map(function (item) {
                return { authorName: item.author_name, body: item.body };
              })
            })
            .then(function (text) {
              replyForm.body.value = text;
              replyError.textContent = "";
            })
            .catch(function (error) {
              replyError.textContent = error.message || "초안을 만들지 못했습니다.";
            })
            .finally(function () {
              aiReplyButton.disabled = false;
              aiReplyButton.textContent = original;
            });
        });

        deleteButton.addEventListener("click", function () {
          if (!window.confirm("이 글과 답글을 삭제할까요?")) return;
          db.from("posts")
            .delete()
            .eq("id", id)
            .then(function (result) {
              if (result.error) {
                throw result.error;
              }
              location.replace("board.html");
            })
            .catch(function (error) {
              replyError.textContent = error.message || "글을 삭제하지 못했습니다.";
            });
        });

        replyForm.addEventListener("submit", function (event) {
          event.preventDefault();
          var body = replyForm.body.value.trim();
          replyError.textContent = "";
          if (!body) {
            replyError.textContent = "답글 내용을 입력해 주세요.";
            return;
          }
          db.from("post_replies")
            .insert({
              post_id: id,
              author_id: session.user.id,
              author_name: "SELVÈRE 관리자",
              body: body
            })
            .then(function (result) {
              if (result.error) {
                throw result.error;
              }
              replyForm.reset();
              return loadReplies(true);
            })
            .catch(function (error) {
              var message = error.message || "답글을 저장하지 못했습니다.";
              if (/could not find the table/i.test(message) || /schema cache/i.test(message)) {
                message = "post_replies 테이블이 없습니다. Supabase SQL Editor에서 replies.sql을 실행해 주세요.";
              }
              replyError.textContent = message;
            });
        });

        replyList.addEventListener("click", function (event) {
          var button = event.target.closest("[data-delete-reply]");
          if (!button) return;
          if (!window.confirm("이 답글을 삭제할까요?")) return;
          db.from("post_replies")
            .delete()
            .eq("id", button.getAttribute("data-delete-reply"))
            .then(function (result) {
              if (result.error) {
                throw result.error;
              }
              return loadReplies(true);
            })
            .catch(function (error) {
              replyError.textContent = error.message || "답글을 삭제하지 못했습니다.";
            });
        });
      });
  }).catch(function () {
    statusEl.textContent = "글을 찾을 수 없거나 권한이 없습니다.";
  });
})();
