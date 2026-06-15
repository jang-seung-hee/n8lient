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
    titleRequired: true
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
