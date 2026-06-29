"use strict";
// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
// Source: src/common/knowledge/knowledgeSearchIndex.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldIndexSubmission = shouldIndexSubmission;
exports.normalizeSearchText = normalizeSearchText;
exports.buildSearchTokens = buildSearchTokens;
exports.buildKnowledgeSearchIndexDocRaw = buildKnowledgeSearchIndexDocRaw;
/**
 * 인덱싱 대상 적합성 검증 함수
 */
function shouldIndexSubmission(submission) {
    if (submission.status !== "success")
        return false;
    if (!submission.clientId || !submission.workflowKey)
        return false;
    if (!submission.processorResult)
        return false;
    const policy = submission.retentionPolicySnapshot || submission.retentionPolicy || {};
    const level = policy.level || "full_archive";
    if (level === "notify_only")
        return false;
    return true;
}
/**
 * 검색 대상 문자열 normalize 처리 유틸
 */
function normalizeSearchText(text) {
    if (!text)
        return "";
    return text
        .toLowerCase()
        .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, " ") // 알파벳, 숫자, 한글, 공백 제외하고 공백 대체
        .replace(/\s+/g, " ") // 연속된 공백을 단일 공백으로 치환
        .trim();
}
/**
 * N-Gram 기반 한국어 부분 매칭을 포함하는 제한형 검색 토큰 리스트 생성
 */
function buildSearchTokens(text) {
    const normalized = normalizeSearchText(text);
    if (!normalized)
        return [];
    // URL, 이메일, 토큰성 문자열, 민감 정보 정규식 필터링
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const tokenRegex = /^[a-zA-Z0-9_-]{20,}$/g; // 20글자 이상 영어/숫자/하이픈 토큰성 문자열
    const cleanedText = normalized
        .replace(urlRegex, "")
        .replace(emailRegex, "")
        .replace(tokenRegex, "");
    const words = cleanedText.split(" ").filter(Boolean);
    const tokenSet = new Set();
    for (const word of words) {
        // 1글자 이하 토큰 및 20글자 초과 긴 토큰 필터링
        if (word.length <= 1 || word.length > 20)
            continue;
        // 기본 단어 추가
        tokenSet.add(word);
        // 한국어 부분 검색 보완을 위한 2-Gram 분할 생성 (예: "회의록" -> "회의", "의록")
        // 한글 문자열만 대상으로 2-Gram 분해를 타도록 처리
        if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(word) && word.length > 2) {
            for (let i = 0; i < word.length - 1; i++) {
                const sub = word.substring(i, i + 2);
                if (sub.length === 2) {
                    tokenSet.add(sub);
                }
            }
        }
    }
    // 중복 제거된 배열 반환 및 최대 200개 제한
    return Array.from(tokenSet).slice(0, 200);
}
/**
 * 인덱스 문서 조립 헬퍼
 * 호출하는 쪽에서 시간 필드를 Firestore의 Timestamp 객체로 래핑하여 완성하도록
 * 본 함수에서는 공통 포맷으로 매핑하여 반환합니다.
 */
function buildKnowledgeSearchIndexDocRaw(submission, ownerName, ownerEmail, workflowName) {
    const pr = submission.processorResult || {
        title: null,
        summary: null,
        content: null,
        mdContent: null,
        structuredData: null,
        keywords: null,
        warnings: null,
    };
    const title = submission.displayTitle || pr.title || submission.input?.submissionTitle || "Untitled";
    const summary = pr.summary || "";
    const keywords = pr.keywords || [];
    // mdContent는 요약본(최대 1500자)만 searchText에 주입하여 DB 용량 과다 점유 및 비용 방지
    const mdSnippet = pr.mdContent ? pr.mdContent.substring(0, 1500) : "";
    // 검색 텍스트 구성: 제목 + 요약 + 키워드 목록 + 본문 일부
    const combinedText = `${title} ${summary} ${keywords.join(" ")} ${mdSnippet}`;
    const searchTokens = buildSearchTokens(combinedText);
    const policy = submission.retentionPolicySnapshot || submission.retentionPolicy || {};
    const level = (policy.level === "processed_result" ? "processed_result" : "full_archive");
    return {
        submissionId: submission.submissionId,
        clientId: submission.clientId,
        ownerUid: submission.uid,
        ownerName: ownerName || undefined,
        ownerEmail: ownerEmail || undefined,
        workflowKey: submission.workflowKey,
        automationId: submission.automationId || undefined,
        workflowName: workflowName || undefined,
        accessMode: submission.accessMode === "company" ? "company" : "private",
        retentionLevel: level,
        title,
        summary,
        keywords,
        tags: [],
        searchText: combinedText.substring(0, 2000), // 최대 2000글자로 안전 격리
        searchTokens,
        createdAt: submission.createdAt,
        completedAt: submission.completedAt || null,
        updatedAt: submission.updatedAt,
        sourceType: "submission",
    };
}
