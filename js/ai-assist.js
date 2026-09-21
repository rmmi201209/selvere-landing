(function (window) {
  function endpoint() {
    var host = location.hostname;
    if (host === "127.0.0.1" || host === "localhost") {
      return "http://127.0.0.1:5510/api/ai-assist";
    }
    return "/api/ai-assist";
  }

  function koreanError(error) {
    var message = (error && error.message) || "초안을 만들지 못했습니다.";
    if (/failed to fetch|networkerror|load failed/i.test(message)) {
      return "AI 서버에 연결하지 못했습니다. 로컬이면 scripts/ai-server.cjs 가 켜져 있는지, 배포면 GEMINI_API_KEY 환경 변수를 확인해 주세요.";
    }
    return message;
  }

  window.selvereAi = {
    draft: function (session, task, payload) {
      var token = session && session.access_token;
      if (!token) {
        return Promise.reject(new Error("로그인이 필요합니다."));
      }
      return fetch(endpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify({ task: task, payload: payload })
      })
        .then(function (response) {
          return response.json().catch(function () {
            return {};
          }).then(function (data) {
            if (!response.ok) {
              throw new Error(data.error || "초안을 만들지 못했습니다.");
            }
            if (!data.text) {
              throw new Error("AI가 빈 초안을 반환했습니다.");
            }
            return data.text;
          });
        })
        .catch(function (error) {
          throw new Error(koreanError(error));
        });
    }
  };
})(window);
