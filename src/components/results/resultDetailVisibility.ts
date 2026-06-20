// 실행 결과 상세 화면 역할별 섹션 visible/defaultOpen 정책 SSOT

import type { ResultSectionKey, SectionVisibility, ViewerRole } from "./resultDetailTypes";

export const RESULT_DETAIL_VISIBILITY: Record<
  ViewerRole,
  Record<ResultSectionKey, SectionVisibility>
> = {
  user: {
    basicInfo: { visible: true, defaultOpen: true },
    statusSummary: { visible: true, defaultOpen: true },
    inputInfo: { visible: true, defaultOpen: false },
    retentionPolicy: { visible: true, defaultOpen: false },
    originalFiles: { visible: true, defaultOpen: false },
    resultSummary: { visible: true, defaultOpen: false },
    reportBody: { visible: true, defaultOpen: false },
    structuredData: { visible: false, defaultOpen: false },
    resultFiles: { visible: true, defaultOpen: false },
    optionalExport: { visible: true, defaultOpen: false },
    actions: { visible: true, defaultOpen: false },
    debugInfo: { visible: true, defaultOpen: false },
    snapshots: { visible: false, defaultOpen: false },
    rawJson: { visible: false, defaultOpen: false },
  },

  companyAdmin: {
    basicInfo: { visible: true, defaultOpen: true },
    statusSummary: { visible: true, defaultOpen: true },
    inputInfo: { visible: true, defaultOpen: false },
    retentionPolicy: { visible: true, defaultOpen: false },
    originalFiles: { visible: true, defaultOpen: false },
    resultSummary: { visible: true, defaultOpen: false },
    reportBody: { visible: true, defaultOpen: false },
    structuredData: { visible: true, defaultOpen: false },
    resultFiles: { visible: true, defaultOpen: false },
    optionalExport: { visible: true, defaultOpen: false },
    actions: { visible: true, defaultOpen: false },
    debugInfo: { visible: true, defaultOpen: false },
    snapshots: { visible: false, defaultOpen: false },
    rawJson: { visible: false, defaultOpen: false },
  },

  operator: {
    basicInfo: { visible: true, defaultOpen: true },
    statusSummary: { visible: true, defaultOpen: true },
    inputInfo: { visible: true, defaultOpen: false },
    retentionPolicy: { visible: true, defaultOpen: false },
    originalFiles: { visible: true, defaultOpen: false },
    resultSummary: { visible: true, defaultOpen: false },
    reportBody: { visible: true, defaultOpen: false },
    structuredData: { visible: true, defaultOpen: false },
    resultFiles: { visible: true, defaultOpen: false },
    optionalExport: { visible: true, defaultOpen: false },
    actions: { visible: true, defaultOpen: false },
    debugInfo: { visible: true, defaultOpen: false },
    snapshots: { visible: false, defaultOpen: false },
    rawJson: { visible: false, defaultOpen: false },
  },
};

/** 역할·섹션 키로 visibility 정책 조회 */
export function getSectionVisibility(
  viewerRole: ViewerRole,
  sectionKey: ResultSectionKey
): SectionVisibility {
  return RESULT_DETAIL_VISIBILITY[viewerRole][sectionKey];
}
