const ADMIN_ROLES = {
  "skc98@daum.net": ["inbound", "board"],
  "skc99@daum.net": ["inbound"],
  "skc00@daum.net": ["board"]
};

const SUPABASE_URL = "https://bwdfveqototxcxhoqjxs.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_snA3kENjaECbsSI4eGr2Zg_-4bc9lLD";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

function httpError(status, message) {
  const error = new Error(message);
  error.statusCode = status;
  return error;
}

function clip(value, max) {
  return String(value || "").replace(/\s+$/g, "").slice(0, max);
}

function applyCors(req, res) {
  const origin = String(req.headers.origin || "");
  if (/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  }
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  if (typeof req.body === "string" && req.body) {
    return JSON.parse(req.body);
  }
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return {};
  }
  return JSON.parse(raw);
}

async function verifyAdmin(accessToken, requiredScope) {
  if (!accessToken) {
    throw httpError(401, "로그인이 필요합니다.");
  }

  const response = await fetch(SUPABASE_URL + "/auth/v1/user", {
    headers: {
      Authorization: "Bearer " + accessToken,
      apikey: SUPABASE_PUBLISHABLE_KEY
    }
  });

  if (!response.ok) {
    throw httpError(401, "세션이 만료되었습니다. 다시 로그인해 주세요.");
  }

  const user = await response.json();
  const email = String(user.email || "").toLowerCase();
  const scopes = ADMIN_ROLES[email] || [];
  if (scopes.indexOf(requiredScope) === -1) {
    throw httpError(403, "이 계정은 해당 AI 기능을 사용할 권한이 없습니다.");
  }
  return email;
}

function inquiryPrompt(payload) {
  return {
    system:
      "당신은 SELVÈRE(바이오-클리니컬 럭셔리 스킨케어) 인바운드 담당자를 돕는 내부 업무 비서입니다. " +
      "고객에게 보내는 메일이나 문자가 아니라, 담당자가 비고란에 남길 실무 메모만 한국어로 작성합니다.",
    user:
      "아래 B2B/고객 문의를 보고 담당자가 지금 해야 할 일을 비고 초안으로 적어 주세요.\n\n" +
      "- 현재 상태: " + clip(payload.status, 40) + "\n" +
      "- 문의 분류: " + clip(payload.category, 80) + "\n" +
      "- 이름: " + clip(payload.name, 80) + "\n" +
      "- 회사: " + clip(payload.company, 120) + "\n" +
      "- 연락처: " + clip(payload.phone, 40) + "\n" +
      "- 이메일: " + clip(payload.email, 120) + "\n" +
      "- 문의 내용:\n" + clip(payload.message, 4000) + "\n" +
      "- 기존 비고:\n" + clip(payload.note, 2000) + "\n\n" +
      "작성 규칙:\n" +
      "1. 고객 답장 초안을 쓰지 말고, 담당자용 할 일만 적을 것.\n" +
      "2. 현재 상태를 고려해 다음 행동을 구체적으로 제안할 것. 예: 누구에게 언제 연락할지, 확인할 자료, 권장 다음 상태.\n" +
      "3. 3~6줄. 짧은 줄글 또는 간단한 불릿. 마크다운 제목/코드블록 금지.\n" +
      "4. 가격, 재고, 계약 조건, 의학적 효능처럼 확인되지 않은 사실을 지어내지 말 것.\n" +
      "5. 기존 비고에 유용한 내용이 있으면 유지하고 보완할 것.\n" +
      "6. 설명 문장 없이 비고 본문만 출력할 것."
  };
}

function replyPrompt(payload) {
  const replies = Array.isArray(payload.replies) ? payload.replies : [];
  const replyText = replies.length
    ? replies
        .slice(-4)
        .map(function (item, index) {
          return (
            String(index + 1) +
            ") " +
            clip(item.authorName || item.author_name, 40) +
            ": " +
            clip(item.body, 800)
          );
        })
        .join("\n")
    : "(아직 없음)";

  return {
    system:
      "당신은 SELVÈRE 고객케어 담당자입니다. 커뮤니티 게시글에 달 공개 답글 초안을 한국어로 작성합니다. " +
      "말투는 정중하고 따뜻하며 과하게 친근하지 않은 존댓말입니다. 고객이 안심할 수 있게 경청한 티가 나게 씁니다.",
    user:
      "아래 게시글에 달 관리자 답글 초안을 작성해 주세요.\n\n" +
      "- 작성자: " + clip(payload.authorName || payload.author_name, 80) + "\n" +
      "- 제목: " + clip(payload.title, 200) + "\n" +
      "- 본문:\n" + clip(payload.body, 4000) + "\n" +
      "- 기존 답글:\n" + replyText + "\n\n" +
      "작성 규칙:\n" +
      "1. 글을 남겨 주셔서 감사하다는 인사를 자연스럽게 넣을 것.\n" +
      "2. 질문이나 고민을 짧게 짚고, 가능한 범위에서만 안내할 것.\n" +
      "3. 효능, 가격, 재고, 배송일, 할인처럼 확인되지 않은 사실은 단정하지 말 것. 필요하면 별도 문의나 전문 상담으로 이어지겠다고 안내할 것.\n" +
      "4. 공감은 하되 과잉 사과, 과장은 피할 것.\n" +
      "5. 4~8문장, 이모지/마크다운 없이 본문만.\n" +
      "6. 마지막 줄은 'SELVÈRE 고객케어'로 마무리할 것.\n" +
      "7. 이미 달린 답글과 같은 말을 반복하지 말 것.\n" +
      "8. 설명 없이 답글 초안만 출력할 것."
  };
}

function cleanDraft(text) {
  return String(text || "")
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

async function generateDraft(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw httpError(500, "서버에 GEMINI_API_KEY가 없습니다. .env.local 또는 Vercel 환경 변수에 키를 넣어 주세요.");
  }

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(GEMINI_MODEL) +
      ":generateContent?key=" +
      encodeURIComponent(apiKey),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: prompt.system }] },
        contents: [{ role: "user", parts: [{ text: prompt.user }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 700
        }
      })
    }
  );

  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    const raw = data.error && data.error.message ? data.error.message : "Gemini 요청에 실패했습니다.";
    if (/API key|UNAUTHENTICATED|401/i.test(raw)) {
      throw httpError(500, "Gemini API 키가 유효하지 않습니다.");
    }
    if (/NOT_FOUND|404/i.test(raw)) {
      throw httpError(500, "사용할 수 있는 Gemini 모델을 찾지 못했습니다.");
    }
    throw httpError(502, "초안을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  const parts = (((data.candidates || [])[0] || {}).content || {}).parts || [];
  const text = cleanDraft(
    parts
      .map(function (part) {
        return part.text || "";
      })
      .join("\n")
  );

  if (!text) {
    throw httpError(502, "AI가 빈 초안을 반환했습니다. 다시 시도해 주세요.");
  }
  return text;
}

async function runAssist(accessToken, task, payload) {
  if (task === "inquiry-note") {
    await verifyAdmin(accessToken, "inbound");
    return generateDraft(inquiryPrompt(payload || {}));
  }
  if (task === "board-reply") {
    await verifyAdmin(accessToken, "board");
    return generateDraft(replyPrompt(payload || {}));
  }
  throw httpError(400, "알 수 없는 AI 작업입니다.");
}

async function handler(req, res) {
  applyCors(req, res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "POST만 사용할 수 있습니다." });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const accessToken = String(req.headers.authorization || "")
      .replace(/^Bearer\s+/i, "")
      .trim();
    const text = await runAssist(accessToken, body.task, body.payload || {});
    sendJson(res, 200, { text: text });
  } catch (error) {
    if (error instanceof SyntaxError) {
      sendJson(res, 400, { error: "요청 형식이 올바르지 않습니다." });
      return;
    }
    const status = error.statusCode || 500;
    sendJson(res, status, { error: error.message || "초안을 만들지 못했습니다." });
  }
}

module.exports = handler;
module.exports.runAssist = runAssist;
