// AI Assist 요청 전 전송될 컨텍스트에서 보안 민감 키 및 값을 마스킹/제거하는 유틸리티입니다.
// 한국어 주석 표준을 준수합니다.

const SENSITIVE_KEYWORDS = [
  "token",
  "secret",
  "credential",
  "credentialid",
  "accesstoken",
  "refreshtoken",
  "privatekey",
  "apikey",
  "api_key",
  "password",
  "serviceaccount",
  "clientsecret",
  "authorization",
  "bearer",
  "cookie",
  "firebaseadmin",
];

// 값이 JWT 혹은 긴 임의의 해시 토큰 형태인지 검사하는 정규식
const JWT_PATTERN = /^[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+$/;
const HEX_OR_BASE64_TOKEN_PATTERN = /^[a-fA-F0-9]{32,256}$|^[a-zA-Z0-9+/]{40,256}={0,2}$/;

interface SanitizeResult {
  sanitizedContext: Record<string, unknown>;
  warnings: string[];
}

/**
 * AI Assist로 전송할 컨텍스트 데이터를 정화합니다.
 * 민감한 키를 감지하면 해당 값을 '[REDACTED]'로 교체하고 warnings 목록에 기록합니다.
 * @param context 정화할 원본 컨텍스트 데이터
 */
export function sanitizeAiContext(context: Record<string, unknown>): SanitizeResult {
  const warnings: string[] = [];

  const walk = (val: unknown, currentKey = ""): unknown => {
    if (val === null || val === undefined) {
      return val;
    }

    if (Array.isArray(val)) {
      return val.map((item, idx) => walk(item, `${currentKey}[${idx}]`));
    }

    if (typeof val === "object") {
      const obj = val as Record<string, unknown>;
      const cleanedObj: Record<string, unknown> = {};

      for (const key of Object.keys(obj)) {
        const lowerKey = key.toLowerCase();
        const fullPath = currentKey ? `${currentKey}.${key}` : key;

        // 1. 키 이름에 민감 정보가 포함되어 있는지 검사
        const isSensitiveKey = SENSITIVE_KEYWORDS.some((kw) => lowerKey.includes(kw));

        if (isSensitiveKey) {
          cleanedObj[key] = "[REDACTED]";
          warnings.push(`[Security] 민감 키워드 감출 처리 완료: '${fullPath}' 필드 값이 삭제되었습니다.`);
        } else {
          cleanedObj[key] = walk(obj[key], fullPath);
        }
      }
      return cleanedObj;
    }

    if (typeof val === "string") {
      // 2. 값 자체가 토큰 형식(JWT 등)을 띠거나 지나치게 긴 임의성 키인지 검사
      const trimmedVal = val.trim();
      if (JWT_PATTERN.test(trimmedVal) || HEX_OR_BASE64_TOKEN_PATTERN.test(trimmedVal)) {
        warnings.push(`[Security] 민감한 토큰 패턴 감출 처리 완료: '${currentKey}' 필드의 무작위 데이터가 삭제되었습니다.`);
        return "[REDACTED]";
      }
    }

    return val;
  };

  const sanitizedContext = walk(context) as Record<string, unknown>;

  return {
    sanitizedContext,
    warnings,
  };
}
