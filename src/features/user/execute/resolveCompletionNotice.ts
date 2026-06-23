import React from "react";

interface CompletionNoticeData {
  emailTo: string | null;
  emailConfigured: boolean;
  emailWillSend: boolean;
  retentionLevel: "notify_only" | "processed_result" | "full_archive" | string;
  databaseEnabled: boolean;
  storageEnabled: boolean;
  googleDriveEnabled: boolean;
}

/**
 * 실행 완료 모달의 상세 결과보고 안내 메시지를 렌더링합니다.
 * 
 * @param completeModalNotice Gateway에서 전달받은 완료 공지 상세 객체
 * @param completeModalMessage 기본 완료 메시지 (Fallback용)
 */
export function resolveCompletionNotice(
  completeModalNotice: CompletionNoticeData | null,
  completeModalMessage: string
): React.ReactNode {
  if (!completeModalNotice) {
    return React.createElement(
      "span",
      { style: { whiteSpace: "pre-wrap" } },
      completeModalMessage
    );
  }

  const {
    emailTo,
    emailWillSend,
    retentionLevel,
    databaseEnabled,
    storageEnabled,
    googleDriveEnabled,
  } = completeModalNotice;

  // 1. 이메일 표시 판정
  const hasEmail = emailWillSend && emailTo;
  const emailDisplay = hasEmail
    ? React.createElement("span", { className: "ux_notice_highlight_success" }, emailTo)
    : React.createElement("span", { className: "ux_notice_highlight_notice" }, "해당사항 없음");

  // 2. 데이터베이스 표시 판정
  const isDbEnabled = databaseEnabled || retentionLevel === "processed_result" || retentionLevel === "full_archive";
  const dbDisplay = isDbEnabled
    ? React.createElement("span", { className: "ux_notice_highlight_success" }, "보관처리 됨")
    : React.createElement("span", { className: "ux_notice_highlight_notice" }, "보관하지 않음");

  // 3. 스토리지 표시 판정
  const isStorageEnabled = storageEnabled || retentionLevel === "full_archive";
  const storageDisplay = isStorageEnabled
    ? React.createElement("span", { className: "ux_notice_highlight_success" }, "보관처리 됨")
    : React.createElement("span", { className: "ux_notice_highlight_notice" }, "보관하지 않음");

  // 4. 구글드라이브 표시 판정
  const driveDisplay = googleDriveEnabled
    ? React.createElement("span", { className: "ux_notice_highlight_success" }, "구글드라이브 저장/내보내기 예정")
    : React.createElement("span", { className: "ux_notice_highlight_notice" }, "해당사항 없음");

  return React.createElement(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: "14px" } },
    [
      React.createElement(
        "div",
        { key: "report-section", style: { display: "flex", flexDirection: "column", gap: "6px" } },
        [
          React.createElement("div", { key: "title", style: { fontWeight: "700", marginBottom: "4px" } }, "[실행 결과보고]"),
          React.createElement("div", { key: "email", style: { margin: 0 } }, "1. 이메일 : ", emailDisplay),
          React.createElement("div", { key: "db", style: { margin: 0 } }, "2. 데이터베이스 : ", dbDisplay),
          React.createElement("div", { key: "storage", style: { margin: 0 } }, "3. 스토리지 : ", storageDisplay),
        ]
      ),
      React.createElement(
        "div",
        { key: "drive-section", style: { display: "flex", flexDirection: "column", gap: "4px" } },
        [
          React.createElement("div", { key: "drive-title", style: { fontWeight: "700" } }, "4. 구글드라이브 옵션"),
          React.createElement("div", { key: "drive-desc", style: { margin: 0, paddingLeft: "8px" } }, "- ", driveDisplay),
        ]
      ),
      React.createElement(
        "div",
        {
          key: "footer-section",
          style: {
            marginTop: "8px",
            borderTop: "1px dashed #e5e7eb",
            paddingTop: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          },
        },
        [
          React.createElement("p", { key: "footer-p1", style: { margin: 0 } }, "워크플로우 처리가 성공하면 설정된 결과보고 방식에 따라 결과가 전달됩니다."),
          React.createElement(
            "p",
            { key: "footer-p2", style: { margin: 0 } },
            [
              "단, 워크플로우 실패 시에는 ",
              React.createElement("span", { key: "err-log", className: "ux_notice_highlight_error" }, "로그화면"),
              "에서만 확인할 수 있습니다.",
            ]
          ),
        ]
      ),
    ]
  );
}
