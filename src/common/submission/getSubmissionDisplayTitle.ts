// 이 파일은 submission 문서에서 UI에 표시할 실행 제목을 일관된 우선순위로 반환하는 헬퍼입니다.

import type { Submission } from "@/types/n8lient";

/**
 * submission의 표시용 제목을 반환합니다.
 * processorResult.title은 callback 이후 displayTitle에 반영되지만, 레거시 문서 호환을 위해 함께 참조합니다.
 */
export function getSubmissionDisplayTitle(submission: Submission): string {
  const input = submission.input as Submission["input"] & {
    submissionTitle?: string | null;
  };

  return (
    submission.displayTitle ||
    submission.processorResult?.title ||
    input.submissionTitle ||
    input.title ||
    submission.submissionId
  );
}
