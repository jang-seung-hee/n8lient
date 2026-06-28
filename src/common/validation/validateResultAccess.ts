import type { ResultAccessMode } from "@/types/n8lient";

/**
 * accessMode 누락 및 잘못된 값은 private으로 해석합니다.
 * 
 * @param value 검사할 값 (accessMode 문자열 등)
 * @returns ResultAccessMode
 */
export function resolveResultAccessMode(value: unknown): ResultAccessMode {
  return value === "company" ? "company" : "private";
}

/**
 * 결과 열람 권한 판정 helper 초안
 * 
 * @param params 사용자 및 submission 데이터
 * @returns 결과 조회 허용 여부 (boolean)
 */
export function canReadSubmissionResult(params: {
  user: {
    uid: string;
    clientId?: string | null;
    role?: string | null;
  };
  submission: {
    uid?: string | null;
    ownerUserId?: string | null;
    clientId?: string | null;
    accessMode?: string | null;
  };
}): boolean {
  const accessMode = resolveResultAccessMode(params.submission.accessMode);
  const ownerId = params.submission.ownerUserId || params.submission.uid;

  // 1. 작성자 본인은 무조건 조회 가능
  if (ownerId && ownerId === params.user.uid) {
    return true;
  }

  // 2. 회사(company) 단위 공유 결과인 경우, 같은 회사(clientId 일치) 구성원만 열람 가능
  if (accessMode === "company") {
    return Boolean(
      params.user.clientId &&
      params.submission.clientId &&
      params.user.clientId === params.submission.clientId
    );
  }

  return false;
}
