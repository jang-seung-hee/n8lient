// 이 파일은 N8Lient 실행 유효성 검사 2단계 사양에서 명시된 12종의 테스트 케이스를 
// validateExecution 헬퍼 함수를 대상으로 자동 시뮬레이션 검증하기 위한 스크립트입니다.
// 프로젝트 루트에서 'npx tsx scripts/testExecutionValidation.ts' 명령어로 구동 가능합니다.
// 한국어 주석 표준을 준수합니다.

import { validateExecution } from "../src/common/validation/validateExecution";
import type { ExecutionValidationParams, ExecutionValidationResult } from "../src/common/validation/validateExecution";

async function runExecutionTests() {
  console.log("=========================================");
  console.log("🧪 N8Lient Execution Validation Test Suites");
  console.log("=========================================\n");

  let testCount = 0;
  let successCount = 0;

  function assertCase(
    name: string,
    params: ExecutionValidationParams,
    expectedIsValid: boolean,
    checkFn?: (res: ExecutionValidationResult) => boolean
  ) {
    testCount++;
    console.log(`[Test #${testCount}] ${name}`);

    const res = validateExecution(params);

    const isMatch = res.isValid === expectedIsValid;
    let isExtraCheckOk = true;
    if (checkFn) {
      isExtraCheckOk = checkFn(res);
    }

    if (isMatch && isExtraCheckOk) {
      console.log(`  => ✅ PASS (isValid: ${res.isValid})`);
      successCount++;
    } else {
      console.error(`  => ❌ FAIL`);
      console.error(`     Expected isValid: ${expectedIsValid}, Actual: ${res.isValid}`);
      console.error(`     Issues:`, JSON.stringify(res.issues, null, 2));
      console.error(`     MissingFields:`, JSON.stringify(res.missingFields, null, 2));
    }
    console.log("-----------------------------------------");
  }

  // 1. titleRequired=false + 제목 없음 + audio 있음 → 통과
  assertCase(
    "titleRequired=false + 제목 없음 + audio 있음",
    {
      automationId: "test-auto",
      input: { text: undefined, title: null },
      files: [{ name: "voice.webm", size: 1024, type: "audio/webm" }],
      inputSchema: {
        titleRequired: false,
        acceptedInputTypes: ["audio"],
        requiredInputMode: "at_least_one",
        requiredInputTypes: ["audio"],
        maxFiles: 1
      }
    },
    true
  );

  // 2. titleRequired=true + 제목 없음 → 차단
  assertCase(
    "titleRequired=true + 제목 없음",
    {
      automationId: "test-auto",
      input: { text: "본문 내용", title: "" },
      inputSchema: {
        titleRequired: true,
        acceptedInputTypes: ["text"]
      }
    },
    false,
    (res) => res.missingFields.includes("input.title")
  );

  // 3. acceptedInputTypes=["text"] + audio 제출 → 차단
  assertCase(
    "acceptedInputTypes=['text'] + audio 제출",
    {
      automationId: "test-auto",
      input: { text: "텍스트", title: "제목" },
      files: [{ name: "voice.webm", size: 1024, type: "audio/webm" }],
      inputSchema: {
        titleRequired: true,
        acceptedInputTypes: ["text"]
      }
    },
    false,
    (res) => res.issues.some(i => i.field === "input.audio" && i.code === "UNSUPPORTED_INPUT_TYPE")
  );

  // 4. requiredInputMode="at_least_one", requiredInputTypes=["text","audio"], audio 있음 → 통과
  assertCase(
    "requiredInputMode='at_least_one', requiredInputTypes=['text','audio'], audio 있음",
    {
      automationId: "test-auto",
      input: { title: "제목" },
      files: [{ name: "voice.webm", size: 1024, type: "audio/webm" }],
      inputSchema: {
        titleRequired: true,
        acceptedInputTypes: ["text", "audio"],
        requiredInputMode: "at_least_one",
        requiredInputTypes: ["text", "audio"]
      }
    },
    true
  );

  // 5. requiredInputMode="at_least_one", requiredInputTypes=["text","audio"], 아무 입력 없음 → 차단
  assertCase(
    "requiredInputMode='at_least_one', requiredInputTypes=['text','audio'], 아무 입력 없음",
    {
      automationId: "test-auto",
      input: { title: "제목" },
      inputSchema: {
        titleRequired: true,
        acceptedInputTypes: ["text", "audio"],
        requiredInputMode: "at_least_one",
        requiredInputTypes: ["text", "audio"]
      }
    },
    false,
    (res) => res.missingFields.includes("input.text") && res.missingFields.includes("input.audio")
  );

  // 6. requiredInputMode="all", requiredInputTypes=["text","audio"], audio만 있음 → 차단
  assertCase(
    "requiredInputMode='all', requiredInputTypes=['text','audio'], audio만 있음",
    {
      automationId: "test-auto",
      input: { title: "제목" },
      files: [{ name: "voice.webm", size: 1024, type: "audio/webm" }],
      inputSchema: {
        titleRequired: true,
        acceptedInputTypes: ["text", "audio"],
        requiredInputMode: "all",
        requiredInputTypes: ["text", "audio"]
      }
    },
    false,
    (res) => res.missingFields.includes("input.text") && !res.missingFields.includes("input.audio")
  );

  // 7. maxFiles=1인데 파일 2개 → 차단
  assertCase(
    "maxFiles=1인데 파일 2개",
    {
      automationId: "test-auto",
      input: { title: "제목", text: "본문" },
      files: [
        { name: "file1.txt", size: 100, type: "text/plain" },
        { name: "file2.txt", size: 100, type: "text/plain" }
      ],
      inputSchema: {
        titleRequired: true,
        acceptedInputTypes: ["text", "file"],
        maxFiles: 1
      }
    },
    false,
    (res) => res.issues.some(i => i.field === "input.files" && i.code === "MAX_FILES_EXCEEDED")
  );

  // 8. allowedFileTypes에 없는 확장자 → 차단
  assertCase(
    "allowedFileTypes에 없는 확장자",
    {
      automationId: "test-auto",
      input: { title: "제목", text: "본문" },
      files: [{ name: "virus.exe", size: 5000, type: "application/octet-stream" }],
      inputSchema: {
        titleRequired: true,
        acceptedInputTypes: ["text", "file"],
        allowedFileTypes: [".txt", ".pdf"]
      }
    },
    false,
    (res) => res.issues.some(i => i.field === "input.files[0]" && i.code === "DISALLOWED_FILE_TYPE")
  );

  // 9. optionalExportProvider=none → Google Drive 폴더 비어 있어도 통과
  assertCase(
    "optionalExportProvider=none",
    {
      automationId: "test-auto",
      input: { title: "제목", text: "본문" },
      inputSchema: { titleRequired: true, acceptedInputTypes: ["text"] },
      configSchema: [
        {
          key: "optionalExportProvider",
          required: false
        },
        {
          key: "googleDriveMdFolderId",
          required: false,
          conditionalRequired: { field: "optionalExportProvider", equals: "google_drive" }
        }
      ],
      settings: {
        optionalExportProvider: "none",
        googleDriveMdFolderId: "" // 비어 있음
      }
    },
    true
  );

  // 10. optionalExportProvider=google_drive → Google Drive 조건부 필수 필드 없으면 차단
  assertCase(
    "optionalExportProvider=google_drive",
    {
      automationId: "test-auto",
      input: { title: "제목", text: "본문" },
      inputSchema: { titleRequired: true, acceptedInputTypes: ["text"] },
      configSchema: [
        {
          key: "optionalExportProvider",
          required: false
        },
        {
          key: "googleDriveMdFolderId",
          required: false,
          conditionalRequired: { field: "optionalExportProvider", equals: "google_drive" }
        }
      ],
      settings: {
        optionalExportProvider: "google_drive",
        googleDriveMdFolderId: "   " // 공백 문자열
      }
    },
    false,
    (res) => res.missingFields.includes("settings.googleDriveMdFolderId")
  );

  // 11. 디버그 정보 민감정보 원천 미포함 검사
  console.log("[Test #11] 디버그 정보 민감정보 노출 방지 검사");
  testCount++;
  try {
    const res = validateExecution({
      automationId: "test-auto",
      input: { title: "제목", text: "본문" },
      inputSchema: { titleRequired: true, acceptedInputTypes: ["text"] },
      configSchema: [{ key: "dbPassword", required: true }],
      settings: { dbPassword: "SUPER_SECRET_PASSWORD" } // 민감 데이터 주입
    });

    const serialized = JSON.stringify(res);
    const hasPasswordExposed = serialized.includes("SUPER_SECRET_PASSWORD");

    if (!hasPasswordExposed) {
      console.log("  => ✅ PASS (결과 직렬화 내용에 실제 패스워드 비밀키 값 누출 없음)");
      successCount++;
    } else {
      console.error("  => ❌ FAIL: 디버그 정보 내에 실제 패스워드가 노출되었습니다.");
    }
  } catch (err: any) {
    console.error("  => ❌ FAIL: 민감정보 노출 테스트 중 에러 발생:", err.message);
  }
  console.log("-----------------------------------------");

  console.log(`\n🎉 Execution Validation Test Finished: ${successCount}/${testCount} passed.`);
  if (successCount === testCount) {
    console.log("💚 All execution validation test suites passed successfully!\n");
  } else {
    console.error("❤️ Some test cases failed. Please review the error outputs.\n");
    process.exit(1);
  }
}

runExecutionTests().catch(err => {
  console.error(err);
  process.exit(1);
});
