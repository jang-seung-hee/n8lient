import type { Submission } from "@/types/n8lient";

/**
 * Windows 파일명 금지 문자(\ / : * ? " < > |) 제거 및 공백 트림 헬퍼
 */
export function sanitizeMarkdownFileName(title: string): string {
  return title.replace(/[\\/:*?"<>|]/g, "").trim() || "report";
}

/**
 * mdContent 내의 특정 마크다운 헤더 섹션(## 내용, ## 제목 등)만 추출하고 불필요한 출처/키워드 제거
 */
export function extractContentFromMdContent(mdContent: string): string {
  if (!mdContent) return "";

  // 1. ## 내용, ## 본문 섹션 시작점을 찾음
  const contentSectionRegex = /(?:^|\n)##\s*(?:내용|본문|리포트|상세)\s*\n([\s\S]*?)(?=(?:\n##\s*|$))/i;
  const match = mdContent.match(contentSectionRegex);
  if (match && match[1]) {
    return match[1].trim();
  }

  // 2. 만약 특정 섹션이 없고 전체 마크다운에 제목/출처/키워드 등의 구역이 섞여있다면, ## 출처나 ## 키워드를 제외시킴
  let cleaned = mdContent;
  
  // ## 출처 섹션 제거
  cleaned = cleaned.replace(/(?:^|\n)##\s*출처\s*\n[\s\S]*?(?=(?:\n##\s*|$))/i, "");
  // ## 키워드 섹션 제거
  cleaned = cleaned.replace(/(?:^|\n)##\s*키워드\s*\n[\s\S]*?(?=(?:\n##\s*|$))/i, "");
  // ## 제목 섹션 제거 (Frontmatter와 겹칠 수 있으므로)
  cleaned = cleaned.replace(/(?:^|\n)##\s*제목\s*\n[\s\S]*?(?=(?:\n##\s*|$))/i, "");

  return cleaned.trim();
}

/**
 * N8Lient 결과 상세 모달용 원본 파일 인증 다운로드 링크 조합 헬퍼
 */
export function buildOriginalFileDownloadUrl(submissionId: string, index: number): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/user/results/download?submissionId=${submissionId}&refType=original&index=${index}`;
}

/**
 * Obsidian 친화형 Frontmatter + Markdown 본문 구조 생성기
 */
export function buildSubmissionMarkdownExport(params: {
  submission: Submission;
  currentUserDoc: any; // UserDoc 타입 대응 (any 처리)
  currentUser: any; // Auth User 타입 대응
}): string {
  const { submission, currentUserDoc, currentUser } = params;
  const procRes = submission.processorResult;

  // 1. 작성자 정보 우선순위 추출
  const authorName =
    (submission as any).authorName ||
    (submission as any).userSnapshot?.name ||
    currentUserDoc?.displayName ||
    currentUser?.displayName ||
    "확인 필요";

  const authorEmail =
    (submission as any).authorEmail ||
    (submission as any).userSnapshot?.email ||
    currentUserDoc?.email ||
    currentUser?.email ||
    "확인 필요";

  // 2. 회사명 우선순위 추출
  const companyName =
    (submission as any).companyName ||
    (submission as any).clientSnapshot?.companyName ||
    "확인 필요";

  // 3. 워크포로우명 우선순위 추출
  const workflowName =
    (submission as any).workflowName ||
    (submission as any).workflowSnapshot?.name ||
    submission.workflowKey;

  // 4. 본문 내용 결정
  let bodyContent = "";
  if (procRes) {
    if (procRes.content) {
      bodyContent = procRes.content.trim();
    } else if (procRes.mdContent) {
      bodyContent = extractContentFromMdContent(procRes.mdContent);
    } else if (procRes.summary) {
      bodyContent = procRes.summary.trim();
    }
  }
  if (!bodyContent && submission.result?.summary) {
    bodyContent = submission.result.summary.trim();
  }

  // 5. 해시태그(태그) YAML 배열 형식 정리
  const rawTags = (procRes as any)?.hashtags || procRes?.keywords || (submission as any)?.keywords || [];
  const tagsYaml = rawTags.length > 0
    ? "\ntags:\n" + rawTags.map((t: string) => `  - ${t}`).join("\n")
    : "\ntags: []";

  // 6. 결과 타이틀 결정
  const displayTitle = procRes?.title || submission.result?.summary || submission.input.title || submission.submissionId;

  // 7. 보관 정책 텍스트화
  const level = submission.retentionPolicySnapshot?.level || "full_archive";
  let levelText = "원본 포함 지식보관형 (full_archive)";
  if (level === "notify_only") levelText = "알림/로그형 (notify_only)";
  else if (level === "processed_result") levelText = "가공지식 저장형 (processed_result)";

  // 8. 첨부파일 섹션 및 원본파일명 빌드
  let attachmentsSection = "";
  let originalFileNamesText = "없음";

  if (level === "processed_result") {
    attachmentsSection = "- 원본 파일: 원본 미보관 (processed_result)";
  } else if (submission.originalFileRefs && submission.originalFileRefs.length > 0) {
    attachmentsSection = submission.originalFileRefs
      .map((ref, idx) => `- 원본 파일: [${ref.fileName}](${buildOriginalFileDownloadUrl(submission.submissionId, idx)})`)
      .join("\n");
    originalFileNamesText = submission.originalFileRefs.map(r => r.fileName).join(", ");
  } else {
    attachmentsSection = "- 원본 파일: 확인 필요";
  }

  // 9. 날짜 포맷 (YYYY-MM-DD HH:mm)
  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return "-";
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "-";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // 10. 마크다운 생성 조립
  return `---
title: "${displayTitle.replace(/"/g, '\\"')}"
author: "${authorName.replace(/"/g, '\\"')}"
authorEmail: "${authorEmail.replace(/"/g, '\\"')}"
company: "${companyName.replace(/"/g, '\\"')}"
workflow: "${workflowName.replace(/"/g, '\\"')}"
workflowKey: "${submission.workflowKey}"
automationId: "${submission.automationId}"
submissionId: "${submission.submissionId}"
createdAt: "${formatDate(submission.createdAt)}"
completedAt: "${formatDate(submission.completedAt)}"${tagsYaml}
retentionLevel: "${level}"
---

# ${displayTitle}

${bodyContent}

## 첨부파일

${attachmentsSection}

## 출처

- 작성자: ${authorName}
- 작성자 이메일: ${authorEmail}
- 회사명: ${companyName}
- 워크플로우: ${workflowName}
- 워크플로우 Key: ${submission.workflowKey}
- 자동화 ID: ${submission.automationId}
- Submission ID: ${submission.submissionId}
- 보관 정책: ${levelText}
- 생성일시: ${formatDate(submission.createdAt)}
- 완료일시: ${formatDate(submission.completedAt)}
- 원본 파일명: ${originalFileNamesText}
`;
}

/**
 * 브라우저 Blob Markdown 파일 다운로드 함수
 */
export function downloadMarkdownFile(markdown: string, fileName: string): void {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
