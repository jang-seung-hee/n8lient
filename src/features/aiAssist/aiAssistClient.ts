// 클라이언트 컴포넌트나 훅에서 /api/ai/assist 내부 엔드포인트를 쉽게 호출할 수 있도록 돕는 클라이언트 유틸리티입니다.
// 호출 시 Firebase Auth의 유효한 ID 토큰을 실어 보내 인증 가드를 통과합니다.
// 한국어 주석 표준을 준수합니다.

import type { AiAssistRequest, AiAssistResponse } from "./aiAssistTypes";
import { auth } from "@/lib/firebase";

/**
 * /api/ai/assist API Route를 호출하여 AI 도움을 요청합니다.
 * @param payload 어시스트 요청 파라미터 (purpose, instruction, context 등)
 */
export async function requestAiAssist(payload: AiAssistRequest): Promise<AiAssistResponse> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // 브라우저 환경에서 현재 로그인 사용자의 Firebase Auth ID Token 획득 시도
    if (typeof window !== "undefined" && auth.currentUser) {
      const idToken = await auth.currentUser.getIdToken();
      headers["Authorization"] = `Bearer ${idToken}`;
    }

    const response = await fetch("/api/ai/assist", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        ok: false,
        errorCode: "AI_REQUEST_FAILED",
        message: `AI 지원 API 요청에 실패하였습니다. (HTTP ${response.status})`,
        warnings: [errorText],
      };
    }

    const data: AiAssistResponse = await response.json();
    return data;
  } catch (err: any) {
    return {
      ok: false,
      errorCode: "AI_REQUEST_FAILED",
      message: `AI 지원 API 연결 중 네트워크 에러가 발생하였습니다: ${err.message}`,
    };
  }
}
