// 공통 AI Assist 관련 타입 정의 파일입니다.
// 한국어 주석 표준을 준수합니다.

export type AiAssistPurpose =
  | "workflow_template_copy"  // 워크플로우 명세 초안 생성 및 보완
  | "config_field_copy"      // 개별 configSchema 필드 문구 생성 및 보완
  | "general_text_assist";    // 기타 일반 텍스트 보조

export interface AiAssistRequest {
  purpose: AiAssistPurpose;
  instruction: string;
  context: Record<string, unknown>;
  outputFormat?: "json" | "text";
}

export interface AiAssistResponse {
  ok: boolean;
  locked?: boolean;
  provider?: "gemini";
  model?: string;
  result?: {
    text?: string;
    json?: any;
  };
  warnings?: string[];
  errorCode?: string;
  message?: string;
}
