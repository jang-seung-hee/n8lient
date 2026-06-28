"use strict";
// AUTO-GENERATED-LIKE FILE FOR GATEWAY.
// 이 파일은 N8Lient 자동화 실행 권한과 관련된 공통 유효성 검사 헬퍼입니다.
// React, Next.js, Firebase, DOM/Node API에 의존하지 않는 순수 TypeScript 파일로 관리됩니다.
// 한국어 주석 표준을 준수합니다.
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveResultAccessMode = resolveResultAccessMode;
exports.canReadSubmissionResult = canReadSubmissionResult;
/**
 * accessMode 누락 및 잘못된 값은 private으로 해석합니다.
 *
 * @param value 검사할 값 (accessMode 문자열 등)
 * @returns ResultAccessMode
 */
function resolveResultAccessMode(value) {
    return value === "company" ? "company" : "private";
}
/**
 * 결과 열람 권한 판정 helper 초안
 *
 * @param params 사용자 및 submission 데이터
 * @returns 결과 조회 허용 여부 (boolean)
 */
function canReadSubmissionResult(params) {
    const accessMode = resolveResultAccessMode(params.submission.accessMode);
    const ownerId = params.submission.ownerUserId || params.submission.uid;
    // 1. 작성자 본인은 무조건 조회 가능
    if (ownerId && ownerId === params.user.uid) {
        return true;
    }
    // 2. 회사(company) 단위 공유 결과인 경우, 같은 회사(clientId 일치) 구성원만 열람 가능
    if (accessMode === "company") {
        return Boolean(params.user.clientId &&
            params.submission.clientId &&
            params.user.clientId === params.submission.clientId);
    }
    return false;
}
