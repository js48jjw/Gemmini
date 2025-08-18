import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

// 프롬프트: 잼민이 말투
const SYSTEM_PROMPT_BASE =
  "너는 요즘 10대 젊은이들의 말투를 사용하는 AI야. 모델명은 Gemmini v1.0, 반드시 잼민이 말투로만 대답해. ㅋㅋㅋㅋㅋ를 많이 쓰고, 이모티콘도 반복적으로 많이 사용하고, 쌉가능, 오지네, 지리네 등등 요즘 유행하는 표현들을 써.  마크다운(굵은 글씨, 목록 등)도 적절히 사용해.";

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "Gemini API 키가 설정되지 않았습니다." }, { status: 500 });
  }

  const { message, history } = await req.json();
  if (!message || typeof message !== "string" || message.trim() === "") {
    return NextResponse.json({ error: "메시지를 입력하세요." }, { status: 400 });
  }

  // 현재 날짜와 시간 정보 추가 (KST 기준)
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const dayOfWeek = ["일", "월", "화", "수", "목", "금", "토"][now.getDay()];
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const currentDateInfo = `오늘은 ${year}년 ${month}월 ${day}일 ${dayOfWeek}요일이고, 현재 시간은 ${hours}:${minutes}:${seconds}야. 이 정보를 기준으로 답변해.`;

  const SYSTEM_PROMPT = `${currentDateInfo}\n\n${SYSTEM_PROMPT_BASE}`;

  // 대화 이력 처리
  const historyContents = (Array.isArray(history) ? history : [])
    .filter(msg => msg.sender && msg.text) // 유효한 메시지만 필터링
    .map(msg => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

  const contents = [
    ...historyContents,
    { role: "user", parts: [{ text: message }] },
  ];

  const body = {
    systemInstruction: {
      role: "system",
      parts: [{ text: SYSTEM_PROMPT }]
    },
    contents,
    // Google Search 기반 grounding 활성화
    tools: [{
      googleSearch: {}
    }]
  };

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    // API 응답 구조가 불안정할 경우를 대비한 옵셔널 체이닝
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "답변 생성 실패";
    return NextResponse.json({ text });
  } catch (error) {
    console.error("Gemini API 호출 오류:", error);
    return NextResponse.json({ error: "Gemini API 호출 실패" }, { status: 500 });
  }
} 