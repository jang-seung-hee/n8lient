// retentionPolicy PATCH 검증용 audio E2E (동일 조건: idea-catcher + processed_result)
// 사용법: npx tsx scripts/e2eRetentionPolicyAudioExecute.ts [--gateway URL]

import { loadEnvConfig } from "@next/env";
import fs from "fs";
import path from "path";
import admin from "firebase-admin";

loadEnvConfig(process.cwd());

function loadFirebaseAdminEnv() {
  const rootDir = process.cwd();
  const files = fs.readdirSync(rootDir);
  const adminsdkEnv = files.find((f) => f.includes("adminsdk") && (f.endsWith(".env") || f.includes(".env")));

  if (adminsdkEnv) {
    const envContent = fs.readFileSync(path.join(rootDir, adminsdkEnv), "utf-8").trim();
    if (envContent.startsWith("{")) {
      const serviceAccount = JSON.parse(envContent);
      process.env.FIREBASE_ADMIN_PROJECT_ID = serviceAccount.project_id;
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL = serviceAccount.client_email;
      process.env.FIREBASE_ADMIN_PRIVATE_KEY = serviceAccount.private_key;
      return;
    }
  }

  const envYamlPath = path.join(rootDir, "env.yaml");
  if (!fs.existsSync(envYamlPath)) return;

  const yamlText = fs.readFileSync(envYamlPath, "utf-8");
  const pick = (key: string) => {
    const match = yamlText.match(new RegExp(`^${key}:\\s*"([\\s\\S]*?)"\\s*$`, "m"));
    return match?.[1]?.replace(/_NL_/g, "\n");
  };

  process.env.FIREBASE_ADMIN_PROJECT_ID = pick("FIREBASE_ADMIN_PROJECT_ID") || process.env.FIREBASE_ADMIN_PROJECT_ID;
  process.env.FIREBASE_ADMIN_CLIENT_EMAIL = pick("FIREBASE_ADMIN_CLIENT_EMAIL") || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  process.env.FIREBASE_ADMIN_PRIVATE_KEY = pick("FIREBASE_ADMIN_PRIVATE_KEY") || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  process.env.GATEWAY_BASE_URL = yamlText.match(/^GATEWAY_BASE_URL:\s*"(.+)"\s*$/m)?.[1] || process.env.GATEWAY_BASE_URL;
}

loadFirebaseAdminEnv();

import { getAdminFirestore, getAdminApp } from "../src/lib/firebaseAdmin";

const TARGET_AUTOMATION_ID = "beta_testing_company_n8lient-idea-catcher-0-9-0-0";
const TARGET_UID = "28MCW8Vj6OgbuJJsOxaBxGzyDly2";

async function getIdTokenForUid(uid: string): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY가 없습니다.");

  const customToken = await admin.auth(getAdminApp()).createCustomToken(uid);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(`Firebase custom token sign-in 실패: ${JSON.stringify(data)}`);
  return data.idToken as string;
}

function createTinyWebmBuffer(): Buffer {
  return Buffer.from([
    0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01, 0x42, 0xf2, 0x81,
    0x04, 0x42, 0xf3, 0x81, 0x08, 0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d,
  ]);
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function assertRetentionPolicy(policy: Record<string, unknown> | undefined) {
  const expected = {
    level: "processed_result",
    emailEnabled: true,
    emailAttachResult: true,
    emailAttachOriginal: true,
    storeOriginalFiles: false,
  };

  const results: Record<string, { expected: unknown; actual: unknown; ok: boolean }> = {};
  for (const [key, value] of Object.entries(expected)) {
    const actual = policy?.[key];
    results[key] = { expected: value, actual, ok: actual === value };
  }
  return results;
}

async function main() {
  const gatewayArgIdx = process.argv.indexOf("--gateway");
  const gatewayBaseUrl =
    (gatewayArgIdx !== -1 ? process.argv[gatewayArgIdx + 1] : null) ||
    process.env.GATEWAY_BASE_URL ||
    process.env.NEXT_PUBLIC_GATEWAY_BASE_URL;

  if (!gatewayBaseUrl) throw new Error("Gateway URL이 없습니다.");

  const db = getAdminFirestore();
  const autoSnap = await db.collection("clientAutomations").doc(TARGET_AUTOMATION_ID).get();
  if (!autoSnap.exists) throw new Error(`자동화를 찾을 수 없습니다: ${TARGET_AUTOMATION_ID}`);

  const auto = autoSnap.data()!;
  const workflowKey = auto.workflowKey as string;

  const payload = {
    automationId: TARGET_AUTOMATION_ID,
    input: {
      title: "PATCH검증 audio 테스트",
      titleProvided: true,
      titleSource: "user",
      inputType: "audio",
    },
  };

  console.log("=== retentionPolicy PATCH audio E2E ===");
  console.log("- gateway:", gatewayBaseUrl);
  console.log("- uid:", TARGET_UID);
  console.log("- automationId:", TARGET_AUTOMATION_ID);
  console.log("- workflowKey:", workflowKey);

  const idToken = await getIdTokenForUid(TARGET_UID);
  const form = new FormData();
  form.append("payload", JSON.stringify(payload));
  form.append(
    "file_0",
    new Blob([new Uint8Array(createTinyWebmBuffer())], { type: "audio/webm" }),
    `patch_verify_${Date.now()}.webm`
  );

  const executeUrl = `${gatewayBaseUrl.replace(/\/$/, "")}/api/automation/execute`;
  const executeRes = await fetch(executeUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
    body: form,
  });

  const executeBody = await executeRes.json();
  console.log("- execute status:", executeRes.status);
  console.log("- execute body:", JSON.stringify(executeBody));

  if (!executeBody?.success) {
    throw new Error(`execute 실패: ${executeBody?.error || executeRes.status}`);
  }

  const submissionId = executeBody.submissionId as string;
  const submissionRef = db.collection("submissions").doc(submissionId);

  // queued 직후 retentionPolicySnapshot 확인
  const queuedSnap = await submissionRef.get();
  const queuedPolicy = queuedSnap.data()?.retentionPolicySnapshot;
  console.log("- queued retentionPolicySnapshot:", JSON.stringify(queuedPolicy, null, 2));

  for (let i = 0; i < 60; i++) {
    await sleep(5000);
    const snap = await submissionRef.get();
    const data = snap.data();
    if (!data) continue;

    console.log(`- poll #${i + 1}: status=${data.status}`);

    if (data.status === "failed") {
      console.log("- error:", JSON.stringify(data.error));
      console.log("- errorDetails:", JSON.stringify(data.errorDetails));
      throw new Error(`submission failed: ${data.error?.message || "unknown"}`);
    }

    if (data.status === "success") {
      const policy = data.retentionPolicySnapshot as Record<string, unknown> | undefined;
      const settings = data.settingsSnapshot as Record<string, unknown> | undefined;
      const checks = assertRetentionPolicy(policy);

      console.log("\n=== retentionPolicySnapshot 검증 ===");
      for (const [key, result] of Object.entries(checks)) {
        console.log(`  ${result.ok ? "✅" : "❌"} ${key}: expected=${result.expected}, actual=${result.actual}`);
      }

      console.log("\n=== settingsSnapshot (이메일 관련) ===");
      console.log("  emailEnabled:", settings?.emailEnabled);
      console.log("  emailAttachResult:", settings?.emailAttachResult);
      console.log("  emailAttachOriginal:", settings?.emailAttachOriginal);
      console.log("  reportEmailTo:", settings?.reportEmailTo ? "(설정됨)" : "(없음)");

      console.log("\n=== input ===");
      console.log("  inputType:", data.input?.inputType);
      console.log("  mimeType:", data.input?.mimeType);
      console.log("  fileName:", data.input?.fileName);

      console.log("\n=== submissionId (로그 조회용) ===");
      console.log(submissionId);

      const allOk = Object.values(checks).every((c) => c.ok);
      if (!allOk) {
        throw new Error("retentionPolicySnapshot 검증 실패");
      }

      console.log("\n✅ retentionPolicySnapshot 검증 통과 (success 대기 완료)");
      return;
    }
  }

  throw new Error("submission success 상태를 시간 내에 확인하지 못했습니다.");
}

main().catch((err) => {
  console.error("❌ E2E 실패:", err.message || err);
  process.exit(1);
});
