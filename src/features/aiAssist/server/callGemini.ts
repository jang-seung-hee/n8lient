// 서버 환경에서 fetch API를 통해 구글 Gemini API를 직접 호출하는 핵심 서비스 모듈입니다.
// 클라이언트 측 자바스크립트 번들에 포함되지 않도록 server/ 디렉토리에 분리 배치합니다.
// 한국어 주석 표준을 준수합니다.

import type { AiAssistRequest, AiAssistResponse } from "../aiAssistTypes";
import { getSystemPromptByPurpose } from "../aiAssistPrompts";

/**
 * Gemini API에 요청을 전송하고 결과를 반환합니다.
 * API 키가 존재하지 않을 경우 에러를 내지 않고 locked 상태를 반환하도록 설계되었습니다.
 * @param payload 클라이언트 측에서 정화(sanitize)를 마친 어시스트 요청 바디
 */
export async function callGemini(payload: AiAssistRequest): Promise<AiAssistResponse> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  // 1. API 키 미설정 시 방어 로직 (LOCKED)
  if (!apiKey) {
    return {
      ok: false,
      locked: true,
      errorCode: "AI_ASSIST_LOCKED",
      message: "AI API 키 값이 등록되어 있지 않아 AI 지원 기능은 잠겨 있습니다. 현재는 기본 분석 방식으로 권장값을 제안합니다.",
      warnings: ["GEMINI_API_KEY가 시스템 환경변수에 존재하지 않습니다."],
    };
  }

  const systemPrompt = getSystemPromptByPurpose(payload.purpose);
  
  // 프롬프트 조립 (지시사항 + 제공 컨텍스트)
  const userContent = `[사용자 지시]
${payload.instruction}

[제공된 컨텍스트 데이터]
${JSON.stringify(payload.context, null, 2)}`;

  // Gemini API 엔드포인트 URL 구성
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // generationConfig 설정 (JSON 요청 시 mime type 지정)
  const isJsonFormat = payload.outputFormat === "json";
  const generationConfig: Record<string, any> = {};
  if (isJsonFormat) {
    generationConfig.responseMimeType = "application/json";
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${systemPrompt}\n\n${userContent}`,
              },
            ],
          },
        ],
        generationConfig,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[Gemini API Error Response]:", errorBody);
      return {
        ok: false,
        errorCode: "AI_REQUEST_FAILED",
        message: `Gemini API 호출에 실패하였습니다. (HTTP 상태 코드: ${response.status})`,
        warnings: [`API response error: ${response.statusText}`],
      };
    }

    const jsonResponse = await response.json();
    const candidateText = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return {
        ok: false,
        errorCode: "AI_RESPONSE_PARSE_FAILED",
        message: "Gemini API의 유효한 텍스트 응답을 가져오지 못했습니다. 안전 필터 등에 의해 차단되었는지 확인하십시오.",
        warnings: ["candidates content is empty."],
      };
    }

    // JSON 형식 반환 요구 시 파싱 시도
    if (isJsonFormat) {
      try {
        const parsedJson = JSON.parse(candidateText.trim());
        return {
          ok: true,
          locked: false,
          provider: "gemini",
          model,
          result: {
            json: parsedJson,
          },
        };
      } catch (jsonErr: any) {
        console.warn("[Gemini Response JSON Parsing Failed]:", candidateText);
        return {
          ok: true,
          locked: false,
          provider: "gemini",
          model,
          result: {
            text: candidateText,
          },
          warnings: ["JSON 형식으로 파싱하는 데 실패하여 원본 텍스트 결과를 반환합니다."],
        };
      }
    }

    // 일반 텍스트 포맷 반환
    return {
      ok: true,
      locked: false,
      provider: "gemini",
      model,
      result: {
        text: candidateText,
      },
    };
  } catch (err: any) {
    console.error("[Gemini Fetch Error]:", err);
    return {
      ok: false,
      errorCode: "AI_REQUEST_FAILED",
      message: `Gemini 호출 도중 네트워크 네트워크 오류가 발생하였습니다: ${err.message}`,
    };
  }
}
