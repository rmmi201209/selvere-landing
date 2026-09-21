(function () {
  var db = window.selvereAuth.db;
  var rowsEl = document.querySelector("#post-rows");
  var statusEl = document.querySelector("[data-board-status]");
  var errorEl = document.querySelector("[data-board-error]");

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

  window.selvereAuth.requireBoardAccess().then(function (session) {
    if (!session) return;
    var isAdmin = window.selvereAuth.isBoardAdmin(session);
    var inboundHint = document.querySelector("[data-inbound-hint]");
    if (inboundHint && window.selvereAuth.isInboundAdmin(session)) {
      inboundHint.classList.remove("hidden");
    }
    return db
      .from("posts")
      .select("id, created_at, author_name, title")
      .order("created_at", { ascending: false })
      .then(function (result) {
        if (result.error) {
          throw result.error;
        }
        var items = result.data || [];
        if (!items.length) {
          statusEl.textContent = "아직 작성된 글이 없습니다.";
          return;
        }
        statusEl.textContent = items.length + "개의 글";
        rowsEl.innerHTML = items
          .map(function (item) {
            return (
              '<tr class="board-row border-t border-alabaster">' +
              '<td class="px-4 py-3"><a class="font-medium hover:text-amberglow" href="post.html?id=' +
              encodeURIComponent(item.id) +
              '">' +
              escapeHtml(item.title) +
              "</a></td>" +
              '<td class="px-4 py-3 text-xs text-slateink">' +
              escapeHtml(item.author_name) +
              "</td>" +
              '<td class="px-4 py-3 text-xs text-slateink">' +
              escapeHtml(formatDate(item.created_at)) +
              "</td>" +
              '<td class="px-4 py-3 text-right">' +
              (isAdmin
                ? '<button class="text-[10px] tracking-[0.12em] uppercase text-slateink" type="button" data-delete-post="' +
                  escapeHtml(item.id) +
                  '">삭제</button>'
                : "") +
              "</td></tr>"
            );
          })
          .join("");
      });
  }).then(function () {
    rowsEl.addEventListener("click", function (event) {
      var button = event.target.closest("[data-delete-post]");
      if (!button) return;
      if (!window.confirm("이 글을 삭제할까요?")) return;
      db.from("posts")
        .delete()
        .eq("id", button.getAttribute("data-delete-post"))
        .then(function (result) {
          if (result.error) {
            throw result.error;
          }
          location.reload();
        })
        .catch(function (error) {
          errorEl.textContent = error.message || "글을 삭제하지 못했습니다.";
        });
    });
  }).catch(function (error) {
    errorEl.textContent = error.message || "목록을 불러오지 못했습니다.";
  });
})();
