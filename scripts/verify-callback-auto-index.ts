/**
 * [verify-callback-auto-index.ts]
 * 목적: 특정 submissionId에 대해 아래 사항을 자동 진단합니다.
 *   1. submissions 문서 상태 확인 (status, processorResult, retentionLevel, accessMode)
 *   2. knowledgeSearchIndex 자동 생성 여부 확인
 *   3. 미생성 시 shouldIndexSubmission 실패 원인 자동 판별
 *
 * 사용법:
 *   npx tsx scripts/verify-callback-auto-index.ts --submissionId <submissionId>
 *
 * 예시:
 *   npx tsx scripts/verify-callback-auto-index.ts --submissionId sub_20260629_abc123
 *
 * 주의:
 *   - 읽기 전용 스크립트 (write 없음)
 *   - Firestore 원본 수정 없음
 */

import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

// ── Firebase Admin 초기화 ──────────────────────────────────────────────────────
const rootDir = process.cwd();
const files = fs.readdirSync(rootDir);
const adminsdkFile = files.find(
  (f) => f.includes("adminsdk") && (f.endsWith(".env") || f.includes(".env"))
);

if (!adminsdkFile) {
  console.error("❌ adminsdk env 파일을 찾지 못했습니다. 루트 디렉터리에 *adminsdk*.env 파일을 확인하세요.");
  process.exit(1);
}

const envPath = path.join(rootDir, adminsdkFile);
const envContent = fs.readFileSync(envPath, "utf-8").trim();

let serviceAccount: any;
if (envContent.startsWith("{")) {
  serviceAccount = JSON.parse(envContent);
} else {
  serviceAccount = {};
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      const key = match[1].trim();
      if (key === "FIREBASE_ADMIN_PROJECT_ID") serviceAccount.project_id = val;
      if (key === "FIREBASE_ADMIN_CLIENT_EMAIL") serviceAccount.client_email = val;
      if (key === "FIREBASE_ADMIN_PRIVATE_KEY") serviceAccount.private_key = val.replace(/\\n/g, "\n");
    }
  });
}

if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
  console.error("❌ 서비스 계정 정보가 누락되었습니다. project_id / client_email / private_key를 확인하세요.");
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}
const db = admin.firestore();

// ── 인수 파싱 ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const subIdIdx = args.indexOf("--submissionId");
const latestMode = args.includes("--latest");
const clientIdIdx = args.indexOf("--clientId");

let submissionId: string | null = null;
let targetClientId: string | null = null;

if (subIdIdx !== -1 && args[subIdIdx + 1]) {
  // --submissionId 모드: 특정 submissionId 지정
  submissionId = args[subIdIdx + 1];
} else if (latestMode) {
  // --latest 모드: Firestore에서 최근 success 문서 자동 조회
  if (clientIdIdx !== -1 && args[clientIdIdx + 1]) {
    targetClientId = args[clientIdIdx + 1];
  }
} else {
  console.error("❌ 사용법:");
  console.error("   npx tsx scripts/verify-callback-auto-index.ts --submissionId <submissionId>");
  console.error("   npx tsx scripts/verify-callback-auto-index.ts --latest --clientId <clientId>");
  process.exit(1);
}

// ── 진단 함수 ─────────────────────────────────────────────────────────────────
async function verify() {
  // --latest 모드: Firestore에서 최근 success 문서 자동 탐색
  let resolvedSubmissionId = submissionId;
  if (!resolvedSubmissionId && latestMode) {
    console.log(`\n🔎 --latest 모드: 최근 success 문서를 Firestore에서 탐색합니다.`);
    if (targetClientId) {
      console.log(`   clientId 필터: ${targetClientId}`);
    }

    // 단일 필드 쿼리 (복합 인덱스 불필요): createdAt desc 정렬 후 클라이언트 측에서 status/clientId 필터링
    const q = db.collection("submissions")
      .orderBy("createdAt", "desc")
      .limit(50); // 클라이언트 측 필터링을 위해 여유있게 조회

    const latestSnap = await q.get();
    if (latestSnap.empty) {
      console.error("❌ submissions 컬렉션이 비어 있습니다.");
      process.exit(1);
    }

    let foundDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    for (const doc of latestSnap.docs) {
      const data = doc.data();
      // status 및 clientId 필터 (클라이언트 측에서 처리)
      const statusOk = data.status === "success";
      const clientOk = !targetClientId || data.clientId === targetClientId;
      if (statusOk && clientOk) {
        foundDoc = doc;
        break;
      }
    }

    if (!foundDoc) {
      console.error(`❌ 최근 50건 내에 status=success${targetClientId ? ` + clientId="${targetClientId}"` : ""} 문서를 찾지 못했습니다.`);
      process.exit(1);
    }


    resolvedSubmissionId = foundDoc.id;
    console.log(`   → 발견된 최근 submissionId: ${resolvedSubmissionId}\n`);
  }

  if (!resolvedSubmissionId) {
    console.error("❌ submissionId를 결정할 수 없습니다.");
    process.exit(1);
  }

  console.log(`\n🔍 자동 인덱싱 실증 진단 시작`);
  console.log(`   submissionId: ${resolvedSubmissionId}`);
  console.log(`   projectId   : ${serviceAccount.project_id}\n`);

  // 1. submissions 문서 조회
  const submissionSnap = await db.collection("submissions").doc(resolvedSubmissionId).get();
  if (!submissionSnap.exists) {
    console.error(`❌ [1/4] submissions/${resolvedSubmissionId} 문서가 존재하지 않습니다.`);
    process.exit(1);
  }

  const sub = submissionSnap.data()!;
  const policy = sub.retentionPolicySnapshot || sub.retentionPolicy || {};
  const retentionLevel = policy.level || "full_archive(기본값)";
  const accessMode = sub.accessMode || "(미설정)";
  const hasProcessorResult = !!(sub.processorResult && Object.keys(sub.processorResult).length > 0);
  const status = sub.status;

  console.log("📄 [1/4] submissions 문서 상태");
  console.log(`   status           : ${status}`);
  console.log(`   retentionLevel   : ${retentionLevel}`);
  console.log(`   accessMode       : ${accessMode}`);
  console.log(`   processorResult  : ${hasProcessorResult ? "존재함 ✅" : "없음 ❌"}`);
  console.log(`   displayTitle     : ${sub.displayTitle || "(없음)"}`);
  console.log(`   workflowKey      : ${sub.workflowKey}`);
  console.log(`   clientId         : ${sub.clientId}`);
  console.log(`   ownerUid(uid)    : ${sub.uid}`);
  if (hasProcessorResult) {
    console.log(`   processorResult.title   : ${sub.processorResult?.title || "(없음)"}`);
    console.log(`   processorResult.summary : ${sub.processorResult?.summary ? sub.processorResult.summary.substring(0, 80) + "…" : "(없음)"}`);
    console.log(`   processorResult.keywords: ${JSON.stringify(sub.processorResult?.keywords || [])}`);
  }

  // 2. shouldIndexSubmission 조건 판별
  console.log("\n🧪 [2/4] shouldIndexSubmission 조건 체크");
  const fails: string[] = [];
  if (status !== "success") fails.push(`❌ status가 "${status}"입니다. "success"여야 인덱싱 대상입니다.`);
  if (!sub.clientId || !sub.workflowKey) fails.push("❌ clientId 또는 workflowKey가 없습니다.");
  if (!hasProcessorResult) fails.push("❌ processorResult가 없습니다. n8n callback payload에 processorResult가 포함되어야 합니다.");
  if ((policy.level || "full_archive") === "notify_only") fails.push(`❌ retentionLevel이 "notify_only"입니다. 인덱싱 제외 대상입니다.`);

  if (fails.length === 0) {
    console.log("   ✅ 모든 조건 통과 — 인덱싱 대상입니다.");
  } else {
    fails.forEach((f) => console.log(`   ${f}`));
  }

  // 3. knowledgeSearchIndex 문서 조회
  console.log("\n📦 [3/4] knowledgeSearchIndex 문서 확인");
  const idxSnap = await db.collection("knowledgeSearchIndex").doc(resolvedSubmissionId).get();
  if (!idxSnap.exists) {
    console.log(`   ❌ knowledgeSearchIndex/${resolvedSubmissionId} 문서가 존재하지 않습니다.`);
    if (fails.length === 0) {
      console.log("\n   ⚠️  shouldIndexSubmission 조건은 통과하지만 문서가 없습니다.");
      console.log("   → 실행 경로를 확인하세요: 로컬에서는 Next.js route가, 운영에서는 Gateway Cloud Run이 callback을 처리합니다.");
      console.log("   → 로컬 npm run dev 상태에서 자동화를 실행하면 Next.js /api/automation/callback route가 처리합니다.");
      console.log("   → 운영 도메인(netlify)에서 실행하면 Gateway (Cloud Run) callback이 처리합니다.");
      console.log("   → Gateway Cloud Run 로그에서 [callback-index-error] 메시지가 있는지 확인하세요.");
    }
  } else {
    const idx = idxSnap.data()!;
    console.log(`   ✅ 문서 생성 확인!`);
    console.log(`\n📋 [4/4] knowledgeSearchIndex 주요 필드`);
    console.log(`   submissionId      : ${idx.submissionId}`);
    console.log(`   clientId          : ${idx.clientId}`);
    console.log(`   ownerUid          : ${idx.ownerUid}`);
    console.log(`   workflowKey       : ${idx.workflowKey}`);
    console.log(`   workflowName      : ${idx.workflowName || "(없음)"}`);
    console.log(`   accessMode        : ${idx.accessMode}`);
    console.log(`   retentionLevel    : ${idx.retentionLevel}`);
    console.log(`   title             : ${idx.title}`);
    console.log(`   summary           : ${idx.summary ? idx.summary.substring(0, 80) + "…" : "(없음)"}`);
    console.log(`   searchTokens 개수 : ${(idx.searchTokens || []).length}개`);
    console.log(`   searchTokens 샘플 : ${JSON.stringify((idx.searchTokens || []).slice(0, 10))}`);
    console.log(`   sourceType        : ${idx.sourceType}`);
    const createdAt = idx.createdAt?.toDate ? idx.createdAt.toDate().toISOString() : idx.createdAt;
    const updatedAt = idx.updatedAt?.toDate ? idx.updatedAt.toDate().toISOString() : idx.updatedAt;
    console.log(`   createdAt         : ${createdAt}`);
    console.log(`   updatedAt         : ${updatedAt}`);
  }

  console.log("\n✅ 진단 완료.\n");
  process.exit(0);
}

verify().catch((err) => {
  console.error("스크립트 실행 중 오류:", err);
  process.exit(1);
});
