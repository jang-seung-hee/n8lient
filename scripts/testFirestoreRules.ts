import {
  initializeTestEnvironment
} from "@firebase/rules-unit-testing";
import * as fs from "fs";

/**
 * N8Lient Firestore 보안 규칙 검증 자동화 테스트 슈트
 * 대상: Draft 삭제 CASCADE 시 하위 데이터 삭제 제약 조건 검증
 */
async function runRulesTestSuite() {
  console.log("==================================================");
  console.log("🧪 N8Lient Firestore Rules Security Test Suite");
  console.log("==================================================");
  
  // 1. 로컬 firestore.rules 파일 로딩
  const rules = fs.readFileSync("firestore.rules", "utf8");

  // 2. 에뮬레이터 테스트 환경 설정
  const testEnv = await initializeTestEnvironment({
    projectId: "n8lient",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: rules
    }
  });

  // DB 상태 초기화
  await testEnv.clearFirestore();

  // 3. 테스트 대상 역할별 가짜 Auth Context 정의
  const operatorContext = testEnv.authenticatedContext("operator-user-id");
  const operatorDb = operatorContext.firestore();

  // 4. 보안 규칙 우회(withSecurityRulesDisabled)를 활용하여 DB 사전 데이터 셋업
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    
    // (1) 운영자 권한 조회용 사용자 프로필 문서 생성
    await adminDb.doc("users/operator-user-id").set({
      uid: "operator-user-id",
      role: "operator",
      clientId: "test-client",
      approvalStatus: "approved"
    });

    // (2) 템플릿 2종 등록 (Draft 및 Published) + 레거시용 Draft 템플릿 추가
    await adminDb.doc("workflowTemplates/tpl_draft_key").set({
      workflowKey: "tpl_draft_key",
      status: "draft"
    });
    await adminDb.doc("workflowTemplates/tpl_draft_legacy_key").set({
      workflowKey: "tpl_draft_legacy_key",
      status: "draft"
    });
    await adminDb.doc("workflowTemplates/tpl_published_key").set({
      workflowKey: "tpl_published_key",
      status: "published"
    });

    // (3) Draft 관련 하위 테스트 문서 (isTest=true)
    await adminDb.doc("submissions/sub_test_draft").set({
      submissionId: "sub_test_draft",
      workflowKey: "tpl_draft_key",
      isTestExecution: true,
      clientId: "test-client",
      uid: "normal-user"
    });
    await adminDb.doc("userAutomationSettings/setting_test_draft").set({
      settingId: "setting_test_draft",
      workflowKey: "tpl_draft_key",
      isTestSetting: true,
      uid: "normal-user",
      clientId: "test-client"
    });

    // (4) Draft 관련 하위 운영 문서 (isTest=false)
    await adminDb.doc("submissions/sub_prod_in_draft").set({
      submissionId: "sub_prod_in_draft",
      workflowKey: "tpl_draft_key",
      isTestExecution: false,
      clientId: "test-client",
      uid: "normal-user"
    });

    // (5) Published 관련 하위 테스트 문서 (isTest=true)
    await adminDb.doc("submissions/sub_test_in_prod").set({
      submissionId: "sub_test_in_prod",
      workflowKey: "tpl_published_key",
      isTestExecution: true,
      clientId: "test-client",
      uid: "normal-user"
    });
    await adminDb.doc("userAutomationSettings/setting_prod").set({
      settingId: "setting_prod",
      workflowKey: "tpl_draft_key",
      isTestSetting: false,
      uid: "normal-user",
      clientId: "test-client"
    });

    // (6) Draft 관련 하위 레거시 테스트 문서 (isTestExecution / isTestSetting 필드가 아예 없음)
    await adminDb.doc("submissions/sub_legacy_draft").set({
      submissionId: "sub_legacy_draft",
      workflowKey: "tpl_draft_legacy_key",
      clientId: "test-client",
      uid: "normal-user"
    });
    await adminDb.doc("userAutomationSettings/setting_legacy_draft").set({
      settingId: "setting_legacy_draft",
      workflowKey: "tpl_draft_legacy_key",
      uid: "normal-user",
      clientId: "test-client"
    });
  });

  console.log("👉 [준비 단계] Mock 데이터베이스 환경 구축 완료.");
  let passCount = 0;
  let failCount = 0;

  // ────────────────────────────────────────────────────────
  // [TC 1] Draft 템플릿 + isTestExecution/isTestSetting=true 하위 문서 일괄 삭제
  // ────────────────────────────────────────────────────────
  try {
    const batch = operatorDb.batch();
    batch.delete(operatorDb.doc("submissions/sub_test_draft"));
    batch.delete(operatorDb.doc("userAutomationSettings/setting_test_draft"));
    batch.delete(operatorDb.doc("workflowTemplates/tpl_draft_key"));
    await batch.commit();
    console.log("✅ [Test #1 SUCCESS] Draft 템플릿 및 관련 테스트 데이터 batch 일괄 삭제 허용");
    passCount++;
  } catch (err: any) {
    console.error("❌ [Test #1 FAILED] Draft CASCADE 일괄 삭제 거부 에러:", err.message);
    failCount++;
  }

  // ────────────────────────────────────────────────────────
  // [TC 2] Published 템플릿 및 테스트 데이터 일괄 삭제 시도
  // ────────────────────────────────────────────────────────
  try {
    const batch = operatorDb.batch();
    batch.delete(operatorDb.doc("submissions/sub_test_in_prod"));
    batch.delete(operatorDb.doc("workflowTemplates/tpl_published_key"));
    await batch.commit();
    console.error("❌ [Test #2 FAILED] Published 템플릿 및 관련 데이터 삭제 허용됨 (오류)");
    failCount++;
  } catch (err: any) {
    console.log("✅ [Test #2 SUCCESS] Published 템플릿 및 관련 데이터 삭제 차단 성공");
    passCount++;
  }

  // ────────────────────────────────────────────────────────
  // [TC 3] isTestExecution = false 인 운영 submissions 삭제 시도
  // ────────────────────────────────────────────────────────
  try {
    await operatorDb.doc("submissions/sub_prod_in_draft").delete();
    console.error("❌ [Test #3 FAILED] 운영 submissions 데이터(isTestExecution=false) 삭제 허용됨 (오류)");
    failCount++;
  } catch (err: any) {
    console.log("✅ [Test #3 SUCCESS] 운영 submissions 데이터 삭제 차단 성공");
    passCount++;
  }

  // ────────────────────────────────────────────────────────
  // [TC 4] isTestSetting = false 인 운영 userAutomationSettings 삭제 시도
  // ────────────────────────────────────────────────────────
  try {
    await operatorDb.doc("userAutomationSettings/setting_prod").delete();
    console.error("❌ [Test #4 FAILED] 운영 userAutomationSettings 데이터(isTestSetting=false) 삭제 허용됨 (오류)");
    failCount++;
  } catch (err: any) {
    console.log("✅ [Test #4 SUCCESS] 운영 userAutomationSettings 데이터 삭제 차단 성공");
    passCount++;
  }

  // ────────────────────────────────────────────────────────
  // [TC 5] Draft 템플릿에 연결된 레거시 하위 문서(isTest* 필드 없음) 일괄 삭제 (성공 예상)
  // ────────────────────────────────────────────────────────
  try {
    const batch = operatorDb.batch();
    batch.delete(operatorDb.doc("submissions/sub_legacy_draft"));
    batch.delete(operatorDb.doc("userAutomationSettings/setting_legacy_draft"));
    batch.delete(operatorDb.doc("workflowTemplates/tpl_draft_legacy_key"));
    await batch.commit();
    console.log("✅ [Test #5 SUCCESS] Draft 템플릿 및 관련 레거시 테스트 데이터 batch 일괄 삭제 허용");
    passCount++;
  } catch (err: any) {
    console.error("❌ [Test #5 FAILED] Draft 레거시 데이터 CASCADE 삭제 거부 에러:", err.message);
    failCount++;
  }

  console.log("==================================================");
  console.log(`📊 테스트 결과: ${passCount} 통과, ${failCount} 실패`);
  console.log("==================================================");

  await testEnv.cleanup();
  
  if (failCount > 0) {
    process.exit(1);
  }
}

runRulesTestSuite();
