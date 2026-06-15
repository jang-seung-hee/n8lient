// 이 스크립트는 N8Lient Import JSON 검증 및 mapper 처리 정책 수정 지시서에 기재된 테스트 케이스들을 자동 검증하기 위한 스크립트입니다.
// 프로젝트 루트에서 'npx tsx scripts/testWorkflowTemplateValidation.ts' 명령어로 구동 가능합니다.

import { validateWorkflowTemplateImport } from "../src/features/operator/workflowTemplateImport/validateWorkflowTemplateImport";
import { mapImportJsonToWorkflowTemplate } from "../src/features/operator/workflowTemplateImport/mapImportJsonToWorkflowTemplate";
import type { WorkflowTemplateImportDraft } from "../src/features/operator/workflowTemplateImport/workflowTemplateImportTypes";
import type { WorkflowTemplate } from "../src/types/n8lient";

// 1. 공통 기저 템플릿 정의
const getBaseTemplate = (): Partial<WorkflowTemplate> => ({
  workflowKey: "test-workflow",
  name: "테스트 워크플로우",
  shortName: "테스트",
  description: "검증용 테스트 워크플로우입니다.",
  version: "1.0.0",
  status: "published",
  webhookSecretId: "test-secret-id",
  n8nServerKey: "main",
  configSchemaVersion: 1,
  inputSchema: {
    acceptedInputTypes: ["text"],
    allowedFileTypes: [],
    maxFileSizeMB: 10,
    titleRequired: true,
    requiredInputMode: "at_least_one",
    requiredInputTypes: ["text"],
    maxFiles: 0
  },
  configSchema: [],
  retentionCapabilities: {
    maxLevel: "full_archive",
    supportedLevels: ["notify_only", "processed_result", "full_archive"],
    defaultLevel: "full_archive",
    supportsProcessorResult: true,
    supportsOriginalFileRefs: true,
    supportsResultRefs: true,
    supportsResultPolicyRouter: true,
    supportsEmailNotification: false, // 기본값
  },
  operatorRetentionPolicy: {
    allowedLevels: ["notify_only", "processed_result", "full_archive"],
    defaultLevel: "full_archive",
    allowCompanyOverride: true,
    allowUserOverride: true
  }
});

const createDraft = (templatePatch: any): WorkflowTemplateImportDraft => {
  const base = getBaseTemplate();
  
  // 깊은 복사 및 패치 적용
  const mergedCapabilities = templatePatch.retentionCapabilities === null ? undefined : {
    ...base.retentionCapabilities,
    ...templatePatch.retentionCapabilities
  };

  const mergedOperatorPolicy = templatePatch.operatorRetentionPolicy === null ? undefined : {
    ...base.operatorRetentionPolicy,
    ...templatePatch.operatorRetentionPolicy
  };

  // 특정 필드를 아예 누락(delete) 처리하기 위한 헬퍼
  if (templatePatch.retentionCapabilities) {
    for (const key of Object.keys(templatePatch.retentionCapabilities)) {
      if (templatePatch.retentionCapabilities[key] === undefined) {
        delete (mergedCapabilities as any)[key];
      }
    }
  }

  if (templatePatch.operatorRetentionPolicy) {
    for (const key of Object.keys(templatePatch.operatorRetentionPolicy)) {
      if (templatePatch.operatorRetentionPolicy[key] === undefined) {
        delete (mergedOperatorPolicy as any)[key];
      }
    }
  }

  return {
    schemaVersion: "n8lient.workflowTemplateImport.v1",
    source: {
      analyzerVersion: "1.0.0",
      analyzedAt: new Date().toISOString(),
      sourceFileName: "test.json"
    },
    workflowTemplate: {
      ...base,
      ...templatePatch,
      retentionCapabilities: mergedCapabilities as any,
      operatorRetentionPolicy: mergedOperatorPolicy as any
    },
    diagnostics: {
      severity: "ok",
      canSave: true,
      requiresWarningConfirmation: false,
      items: [],
      fieldDiagnostics: {}
    }
  };
};

// 테스트 구동 메인
async function runTests() {
  console.log("=========================================");
  console.log("🧪 N8Lient Import Validation Test Suites");
  console.log("=========================================\n");

  const existingTemplates: WorkflowTemplate[] = [];
  let testCount = 0;
  let successCount = 0;

  function assertCase(name: string, draft: WorkflowTemplateImportDraft, expectedSeverity: "ok" | "warning" | "error", checkFieldName?: string) {
    testCount++;
    console.log(`[Test #${testCount}] ${name}`);
    
    // 검증기 구동
    const validated = validateWorkflowTemplateImport(draft, existingTemplates);
    const resultSeverity = validated.diagnostics.severity;
    
    const isSeverityMatch = resultSeverity === expectedSeverity;
    let isFieldMatch = true;

    if (checkFieldName) {
      isFieldMatch = validated.diagnostics.items.some(item => item.field === checkFieldName && item.level === expectedSeverity);
    }

    if (isSeverityMatch && isFieldMatch) {
      console.log(`  => ✅ PASS (Severity: ${resultSeverity}${checkFieldName ? `, Field: ${checkFieldName} found` : ""})`);
      successCount++;
    } else {
      console.error(`  => ❌ FAIL`);
      console.error(`     Expected Severity: ${expectedSeverity}, Actual: ${resultSeverity}`);
      if (checkFieldName) {
        console.error(`     Expected Error on Field: ${checkFieldName}`);
        console.error(`     Actual Diagnostics items:`, JSON.stringify(validated.diagnostics.items, null, 2));
      }
    }
    console.log("-----------------------------------------");
  }

  // 1. supportsEmailNotification 누락 -> error
  assertCase(
    "supportsEmailNotification 누락 검증",
    createDraft({
      retentionCapabilities: {
        supportsEmailNotification: undefined // 누락 유도
      }
    }),
    "error",
    "retentionCapabilities.supportsEmailNotification"
  );

  // 2. supportsEmailNotification: false -> 정상 (ok)
  assertCase(
    "supportsEmailNotification: false 정상 검증",
    createDraft({
      retentionCapabilities: {
        supportsEmailNotification: false
      }
    }),
    "ok"
  );

  // 3. supportsEmailNotification: "false" -> error (타입 에러)
  assertCase(
    "supportsEmailNotification: \"false\" (문자열) 타입 오류 검증",
    createDraft({
      retentionCapabilities: {
        supportsEmailNotification: "false" // string 형식 주입
      }
    }),
    "error",
    "retentionCapabilities.supportsEmailNotification"
  );

  // 4. supportedLevels: "notify_only" -> error (배열이어야 함)
  assertCase(
    "supportedLevels: \"notify_only\" (문자열) 타입 오류 검증",
    createDraft({
      retentionCapabilities: {
        supportedLevels: "notify_only" as any
      }
    }),
    "error",
    "retentionCapabilities.supportedLevels"
  );

  // 5. supportedLevels: ["notify_only", "processed_result"] -> 정상 (ok)
  assertCase(
    "supportedLevels: [\"notify_only\", \"processed_result\"] 정상 검증",
    createDraft({
      retentionCapabilities: {
        supportedLevels: ["notify_only", "processed_result"],
        maxLevel: "processed_result",
        defaultLevel: "processed_result"
      },
      operatorRetentionPolicy: {
        allowedLevels: ["notify_only", "processed_result"],
        defaultLevel: "processed_result"
      }
    }),
    "ok"
  );

  // 6. operatorRetentionPolicy.allowUserOverride 누락 -> error
  assertCase(
    "operatorRetentionPolicy.allowUserOverride 누락 검증",
    createDraft({
      operatorRetentionPolicy: {
        allowUserOverride: undefined // 누락 유도
      }
    }),
    "error",
    "operatorRetentionPolicy.allowUserOverride"
  );

  // 7. mapper 결과 검증 (undefined 누락 없이 정규화되는가)
  console.log("[Test #7] mapImportJsonToWorkflowTemplate 결과에 undefined 미포함 검증");
  testCount++;
  try {
    const errorDraft = createDraft({
      retentionCapabilities: {
        supportsEmailNotification: undefined,
        maxLevel: undefined
      },
      operatorRetentionPolicy: {
        allowUserOverride: undefined
      }
    });

    const mappedTemplate = mapImportJsonToWorkflowTemplate(errorDraft);

    // 재귀적으로 객체에 undefined가 존재하는지 체크하는 헬퍼 함수
    function hasUndefinedValue(obj: any): boolean {
      if (obj === null || obj === undefined) return obj === undefined;
      if (typeof obj === "object") {
        for (const key of Object.keys(obj)) {
          if (hasUndefinedValue(obj[key])) return true;
        }
      }
      return false;
    }

    const hasUndef = hasUndefinedValue(mappedTemplate);
    if (!hasUndef) {
      console.log("  => ✅ PASS (정규화된 템플릿 결과물에 undefined가 없음)");
      successCount++;
    } else {
      console.error("  => ❌ FAIL: 정규화 결과에 undefined가 여전히 남아있습니다.", JSON.stringify(mappedTemplate, null, 2));
    }
  } catch (err: any) {
    console.error("  => ❌ FAIL: 매퍼 동작 중 예기치 못한 크래시 발생:", err.message);
  }
  console.log("-----------------------------------------");

  // 8. v2.3 스타일 JSON 테스트
  console.log("[Test #8] v2.3 스타일 JSON 수동 테스트");
  testCount++;
  try {
    const v23JsonDraft: WorkflowTemplateImportDraft = {
      schemaVersion: "n8lient.workflowTemplateImport.v1",
      source: { analyzerVersion: "1.0.0", analyzedAt: new Date().toISOString(), sourceFileName: "legacy.json" },
      workflowTemplate: {
        workflowKey: "legacy-test",
        name: "레거시 테스트",
        shortName: "레거",
        version: "1.0.0",
        status: "draft",
        description: "v2.3 호환 테스트",
        webhookSecretId: "legacy-test",
        n8nServerKey: "main",
        inputSchema: {
          titleRequired: false,
          acceptedInputTypes: ["audio"],
          allowedFileTypes: ["webm", "mp3"],
          maxFileSizeMB: 20
        },
        retentionCapabilities: {
          maxLevel: "processed_result",
          defaultLevel: "processed_result",
          supportedLevels: ["notify_only", "processed_result"],
          supportsProcessorResult: true,
          supportsOriginalFileRefs: false,
          supportsResultRefs: false,
          supportsResultPolicyRouter: false,
          supportsEmailNotification: false
        },
        operatorRetentionPolicy: {
          allowedLevels: ["notify_only", "processed_result"],
          defaultLevel: "processed_result",
          allowCompanyOverride: true,
          allowUserOverride: true
        },
        configSchema: []
      },
      diagnostics: { severity: "ok", canSave: true, requiresWarningConfirmation: false, items: [], fieldDiagnostics: {} }
    };

    const validated = validateWorkflowTemplateImport(v23JsonDraft, existingTemplates);
    const mapped = mapImportJsonToWorkflowTemplate(validated);

    const isWarning = validated.diagnostics.severity === "warning";
    const hasDefaultValues =
      mapped.inputSchema.requiredInputMode === "at_least_one" &&
      JSON.stringify(mapped.inputSchema.requiredInputTypes) === JSON.stringify(["audio"]) &&
      mapped.inputSchema.maxFiles === 1;

    if (isWarning && hasDefaultValues) {
      console.log("  => ✅ PASS (warning 표시 및 requiredInputMode/requiredInputTypes/maxFiles 기본값 보완 완료)");
      successCount++;
    } else {
      console.error("  => ❌ FAIL: v2.3 호환 검증 실패. Warning:", isWarning, "Defaults:", hasDefaultValues);
      console.error("     Mapped inputSchema:", mapped.inputSchema);
      console.error("     Diagnostics:", validated.diagnostics.items);
    }
  } catch (err: any) {
    console.error("  => ❌ FAIL: v2.3 테스트 중 예기치 못한 크래시 발생:", err.message);
  }
  console.log("-----------------------------------------");

  // 9. v2.4 스타일 JSON 테스트
  console.log("[Test #9] v2.4 스타일 JSON 수동 테스트");
  testCount++;
  try {
    const v24JsonDraft: WorkflowTemplateImportDraft = {
      schemaVersion: "n8lient.workflowTemplateImport.v1",
      source: { analyzerVersion: "1.0.0", analyzedAt: new Date().toISOString(), sourceFileName: "v24.json" },
      workflowTemplate: {
        workflowKey: "v24-test",
        name: "v2.4 테스트",
        shortName: "V24",
        version: "1.0.0",
        status: "draft",
        description: "v2.4 입력 검증 테스트",
        webhookSecretId: "v24-test",
        n8nServerKey: "main",
        inputSchema: {
          titleRequired: false,
          acceptedInputTypes: ["text", "audio"],
          requiredInputMode: "at_least_one",
          requiredInputTypes: ["text", "audio"],
          allowedFileTypes: ["webm", "mp3", "m4a", "wav"],
          maxFileSizeMB: 20,
          maxFiles: 1
        },
        retentionCapabilities: {
          maxLevel: "processed_result",
          defaultLevel: "processed_result",
          supportedLevels: ["notify_only", "processed_result"],
          supportsProcessorResult: true,
          supportsOriginalFileRefs: false,
          supportsResultRefs: false,
          supportsResultPolicyRouter: false,
          supportsEmailNotification: false
        },
        operatorRetentionPolicy: {
          allowedLevels: ["notify_only", "processed_result"],
          defaultLevel: "processed_result",
          allowCompanyOverride: true,
          allowUserOverride: true
        },
        configSchema: [
          {
            key: "optionalExportProvider",
            label: "외부 내보내기 방식",
            type: "select",
            defaultSource: "none",
            required: false,
            placeholder: "none",
            description: "결과 파일을 외부 저장소로 내보낼지 선택합니다.",
            options: ["none", "google_drive"]
          } as any,
          {
            key: "googleDriveMdFolderId",
            label: "MD 파일 보관 폴더 ID",
            type: "text",
            defaultSource: "직접 입력",
            required: false,
            placeholder: "Google Drive 폴더 ID",
            description: "MD 결과 파일을 저장할 Google Drive 폴더 ID입니다.",
            options: [],
            conditionalRequired: {
              field: "optionalExportProvider",
              equals: "google_drive"
            }
          } as any
        ]
      },
      diagnostics: { severity: "ok", canSave: true, requiresWarningConfirmation: false, items: [], fieldDiagnostics: {} }
    };

    const validated = validateWorkflowTemplateImport(v24JsonDraft, existingTemplates);
    const mapped = mapImportJsonToWorkflowTemplate(validated);

    const canSave = validated.diagnostics.canSave;
    const condReqPreserved = mapped.configSchema.find(f => f.key === "googleDriveMdFolderId")?.conditionalRequired?.field === "optionalExportProvider";

    if (canSave && condReqPreserved) {
      console.log("  => ✅ PASS (canSave=true 및 conditionalRequired 보존 완료)");
      successCount++;
    } else {
      console.error("  => ❌ FAIL: v2.4 검증 실패. CanSave:", canSave, "Preserved:", condReqPreserved);
      console.error("     Mapped configSchema:", mapped.configSchema);
    }
  } catch (err: any) {
    console.error("  => ❌ FAIL: v2.4 테스트 중 예기치 못한 크래시 발생:", err.message);
  }
  console.log("-----------------------------------------");

  // 10. 오류 JSON 테스트
  console.log("[Test #10] 오류 JSON 수동 테스트");
  testCount++;
  try {
    const badJsonDraft: WorkflowTemplateImportDraft = {
      schemaVersion: "n8lient.workflowTemplateImport.v1",
      source: { analyzerVersion: "1.0.0", analyzedAt: new Date().toISOString(), sourceFileName: "bad.json" },
      workflowTemplate: {
        workflowKey: "bad-test",
        name: "오류 테스트",
        shortName: "BAD",
        version: "1.0.0",
        status: "draft",
        description: "잘못된 입력 검증 테스트",
        webhookSecretId: "bad-test",
        n8nServerKey: "main",
        inputSchema: {
          titleRequired: false,
          acceptedInputTypes: ["audio"],
          requiredInputMode: "all",
          requiredInputTypes: ["text"],
          allowedFileTypes: ["webm"],
          maxFileSizeMB: 20,
          maxFiles: 1
        },
        retentionCapabilities: {
          maxLevel: "processed_result",
          defaultLevel: "processed_result",
          supportedLevels: ["notify_only", "processed_result"],
          supportsProcessorResult: true,
          supportsOriginalFileRefs: false,
          supportsResultRefs: false,
          supportsResultPolicyRouter: false,
          supportsEmailNotification: false
        },
        operatorRetentionPolicy: {
          allowedLevels: ["notify_only", "processed_result"],
          defaultLevel: "processed_result",
          allowCompanyOverride: true,
          allowUserOverride: true
        },
        configSchema: []
      },
      diagnostics: { severity: "ok", canSave: true, requiresWarningConfirmation: false, items: [], fieldDiagnostics: {} }
    };

    const validated = validateWorkflowTemplateImport(badJsonDraft, existingTemplates);

    const isError = validated.diagnostics.severity === "error";
    const hasSubsetError = validated.diagnostics.items.some(item =>
      item.field === "inputSchema.requiredInputTypes" &&
      item.message.includes("부분집합")
    );

    if (isError && hasSubsetError) {
      console.log("  => ✅ PASS (Import error 발생 및 부분집합 불일치 진단 표시 확인)");
      successCount++;
    } else {
      console.error("  => ❌ FAIL: 오류 JSON 검증 실패. Error:", isError, "SubsetError:", hasSubsetError);
      console.error("     Diagnostics:", validated.diagnostics.items);
    }
  } catch (err: any) {
    console.error("  => ❌ FAIL: 오류 테스트 중 예기치 못한 크래시 발생:", err.message);
  }
  console.log("-----------------------------------------");

  console.log(`\n🎉 Test Finished: ${successCount}/${testCount} passed.`);
  if (successCount === testCount) {
    console.log("💚 All automated unit test suites passed successfully!\n");
  } else {
    console.error("❤️ Some test cases failed. Please review the error outputs.\n");
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("테스트 실행 에러:", err);
  process.exit(1);
});
