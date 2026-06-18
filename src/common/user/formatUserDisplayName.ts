// 사용자 표시명 포맷 — 실행 결과 상세 등 공통 UI용

export type UserDisplaySource = {
  displayName?: string | null;
  name?: string | null;
  email?: string | null;
  googleId?: string | null;
  uid?: string | null;
};

/**
 * 사용자 표시명을 사람이 읽기 쉬운 형식으로 반환합니다.
 * - 이름 + 구글ID: `홍길동(hong@example.com)`
 * - 구글ID만: `hong@example.com`
 * - fallback: uid 또는 `-`
 */
export function formatUserDisplayName(source: UserDisplaySource): string {
  const name = (source.displayName || source.name || "").trim();
  const googleId = (source.googleId || source.email || "").trim();
  const fallbackId = (source.uid || "").trim();

  if (name && googleId) {
    return `${name}(${googleId})`;
  }

  if (googleId) {
    return googleId;
  }

  if (name) {
    return name;
  }

  return fallbackId || "-";
}

/**
 * 목록용 실행자 라벨 — `이름 / 구글이메일` 형식 (상세 모달의 괄호 형식과 구분)
 */
export function formatUserListActorLabel(source: UserDisplaySource): string {
  const name = (source.displayName || source.name || "").trim();
  const googleEmail = (source.googleId || source.email || "").trim();
  const fallbackId = (source.uid || "").trim();

  if (name && googleEmail) return `${name} / ${googleEmail}`;
  if (googleEmail) return googleEmail;
  if (name) return name;
  return fallbackId || "-";
}

/** submission 문서에 있을 수 있는 실행자 표시 보조 필드 (스키마 변경 없이 런타임 읽기) */
type SubmissionActorFields = {
  userDisplayName?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  googleId?: string | null;
  userId?: string | null;
};

/**
 * submission + 선택적 override로 실행자 표시용 UserDisplaySource를 조합합니다.
 */
export function resolveSubmissionActorDisplaySource(
  submission: { uid: string },
  override?: UserDisplaySource | null
): UserDisplaySource {
  const extra = submission as typeof submission & SubmissionActorFields;

  return {
    displayName: override?.displayName ?? extra.userDisplayName ?? null,
    name: override?.name ?? extra.userName ?? null,
    email: override?.email ?? extra.userEmail ?? null,
    googleId: override?.googleId ?? extra.googleId ?? null,
    uid: override?.uid ?? extra.userId ?? submission.uid,
  };
}

/** submission 실행자 라벨 (formatUserDisplayName 적용 결과) */
export function formatSubmissionActorLabel(
  submission: { uid: string },
  override?: UserDisplaySource | null
): string {
  return formatUserDisplayName(resolveSubmissionActorDisplaySource(submission, override));
}
