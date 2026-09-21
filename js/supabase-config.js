(function (window) {
  var url = "https://bwdfveqototxcxhoqjxs.supabase.co";
  var publishableKey = "sb_publishable_snA3kENjaECbsSI4eGr2Zg_-4bc9lLD";

  window.SELVERE_SUPABASE = {
    url: url,
    publishableKey: publishableKey,
    statuses: ["접수대기", "상담중", "연락완료", "보류", "완료"],
    createClient: function () {
      if (!window.supabase || typeof window.supabase.createClient !== "function") {
        throw new Error("Supabase 라이브러리를 불러오지 못했습니다.");
      }
      return window.supabase.createClient(url, publishableKey);
    }
  };
})(window);
