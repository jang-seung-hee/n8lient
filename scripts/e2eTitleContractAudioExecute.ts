// titleProvided=false + audio 실행 E2E 스모크 테스트 (Gateway 경유)
// 사용법: npx tsx scripts/e2eTitleContractAudioExecute.ts [--gateway http://localhost:8080]

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
  if (!fs.existsSync(envYamlPath)) {
    return;
  }

  const yamlText = fs.readFileSync(envYamlPath, "utf-8");
  const pick = (key: string) => {
    const match = yamlText.match(new RegExp(`^${key}:\\s*\"([\\s\\S]*?)\"\\s*$`, "m"));
    return match?.[1]?.replace(/_NL_/g, "\n");
  };

  process.env.FIREBASE_ADMIN_PROJECT_ID = pick("FIREBASE_ADMIN_PROJECT_ID") || process.env.FIREBASE_ADMIN_PROJECT_ID;
  process.env.FIREBASE_ADMIN_CLIENT_EMAIL = pick("FIREBASE_ADMIN_CLIENT_EMAIL") || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  process.env.FIREBASE_ADMIN_PRIVATE_KEY = pick("FIREBASE_ADMIN_PRIVATE_KEY") || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  process.env.GATEWAY_BASE_URL = yamlText.match(/^GATEWAY_BASE_URL:\s*\"(.+)\"\\s*$/m)?.[1] || process.env.GATEWAY_BASE_URL;
}

loadFirebaseAdminEnv();

import { getAdminFirestore, getAdminApp } from "../src/lib/firebaseAdmin";
import { buildExecutionTitleContract } from "../src/common/execution/buildTitleContract";

async function getIdTokenForUid(uid: string): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY가 없습니다.");
  }

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
  if (!res.ok) {
    throw new Error(`Firebase custom token sign-in 실패: ${JSON.stringify(data)}`);
  }

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

async function main() {
  const gatewayArgIdx = process.argv.indexOf("--gateway");
  const gatewayBaseUrl =
    (gatewayArgIdx !== -1 ? process.argv[gatewayArgIdx + 1] : null) ||
    process.env.GATEWAY_BASE_URL ||
    process.env.NEXT_PUBLIC_GATEWAY_BASE_URL;

  if (!gatewayBaseUrl) {
    throw new Error("Gateway URL이 없습니다. --gateway 또는 GATEWAY_BASE_URL을 설정하세요.");
  }

  const db = getAdminFirestore();

  const usersSnap = await db.collection("users").where("approvalStatus", "==", "approved").limit(20).get();
  const candidateUser = usersSnap.docs.find((doc) => {
    const data = doc.data();
    return data.role === "user" && data.clientId;
  });

  if (!candidateUser) {
    throw new Error("승인된 일반 사용자(user)를 찾을 수 없습니다.");
  }

  const uid = candidateUser.id;
  const clientId = candidateUser.data().clientId as string;

  const autosSnap = await db
    .collection("clientAutomations")
    .where("clientId", "==", clientId)
    .where("enabled", "==", true)
    .where("configStatus", "==", "configured")
    .limit(20)
    .get();

  let targetAuto: (typeof autosSnap.docs)[number] | null = null;
  let targetTemplate: FirebaseFirestore.DocumentSnapshot | null = null;

  for (const autoDoc of autosSnap.docs) {
    const auto = autoDoc.data();
    const templateSnap = await db.collection("workflowTemplates").doc(auto.workflowKey).get();
    if (!templateSnap.exists) continue;

    const template = templateSnap.data()!;
    const accepted = template.inputSchema?.acceptedInputTypes || [];
    const titleRequired = template.inputSchema?.titleRequired !== false;

    if (accepted.includes("audio") && titleRequired === false) {
      targetAuto = autoDoc;
      targetTemplate = templateSnap;
      break;
    }
  }

  if (!targetAuto || !targetTemplate) {
    throw new Error("titleRequired=false + audio 허용 자동화를 찾을 수 없습니다.");
  }

  const auto = targetAuto.data();
  const template = targetTemplate.data()!;
  const workflowName = template.name || auto.workflowKey;

  const titleContract = buildExecutionTitleContract({
    inputTitle: null,
    titleProvided: false,
    titleSource: "empty",
    workflowName,
  });

  if (titleContract.title !== null) {
    throw new Error("titleContract.title이 null이 아닙니다.");
  }

  const payload = {
    automationId: auto.automationId,
    input: {
      title: titleContract.title,
      titleProvided: titleContract.titleProvided,
      titleSource: titleContract.titleSource,
      inputType: "audio",
    },
  };

  const payloadJson = JSON.stringify(payload);
  if (!payloadJson.includes('"title":null')) {
    throw new Error('payload JSON에 "title":null이 포함되지 않았습니다.');
  }

  console.log("=== E2E title contract audio execute ===");
  console.log("- gateway:", gatewayBaseUrl);
  console.log("- uid:", uid);
  console.log("- automationId:", auto.automationId);
  console.log("- workflowKey:", auto.workflowKey);
  console.log("- payload:", payloadJson);

  const idToken = await getIdTokenForUid(uid);
  const form = new FormData();
  form.append("payload", payloadJson);
  form.append("file_0", new Blob([new Uint8Array(createTinyWebmBuffer())], { type: "audio/webm" }), "e2e_title_contract.webm");

  const executeUrl = `${gatewayBaseUrl.replace(/\/$/, "")}/api/automation/execute`;
  const executeRes = await fetch(executeUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
    body: form,
  });

  const executeBody = await executeRes.json();
  console.log("- execute status:", executeRes.status);
  console.log("- execute body:", JSON.stringify(executeBody));

  const bodyText = JSON.stringify(executeBody);
  if (bodyText.includes("필수 파라미터(automationId, input.title)")) {
    throw new Error("금지 메시지가 반환되었습니다: 필수 파라미터(automationId, input.title)");
  }

  if (!executeBody?.success) {
    throw new Error(`execute 실패: ${executeBody?.error || executeRes.status}`);
  }

  const submissionId = executeBody.submissionId as string;
  const submissionRef = db.collection("submissions").doc(submissionId);

  for (let i = 0; i < 60; i++) {
    await sleep(5000);
    const snap = await submissionRef.get();
    const data = snap.data();
    if (!data) continue;

    console.log(`- poll #${i + 1}: status=${data.status}`);

    if (data.status === "failed") {
      throw new Error(`submission failed: ${data.error?.message || "unknown"}`);
    }

    if (data.status === "success") {
      const inputTitle = data.input?.title;
      const titleProvidedStored = data.input?.titleProvided;
      const processorTitle = data.processorResult?.title;
      const displayTitle = data.displayTitle;

      console.log("=== E2E 결과 ===");
      console.log("- input.title:", inputTitle);
      console.log("- input.titleProvided:", titleProvidedStored);
      console.log("- input.submissionTitle:", data.input?.submissionTitle);
      console.log("- displayTitle:", displayTitle);
      console.log("- processorResult.title:", processorTitle);

      if (inputTitle !== null && inputTitle !== undefined && String(inputTitle).trim() !== "") {
        throw new Error("input.title에 시스템/사용자 제목이 저장되었습니다.");
      }
      if (titleProvidedStored !== false) {
        throw new Error("titleProvided=false가 submission에 저장되지 않았습니다.");
      }
      if (!processorTitle || String(processorTitle).trim() === "") {
        throw new Error("processorResult.title이 생성되지 않았습니다.");
      }
      if (!displayTitle || String(displayTitle).trim() === "") {
        throw new Error("callback 후 displayTitle이 비어 있습니다.");
      }

      console.log("✅ E2E title contract audio execute 성공");
      return;
    }
  }

  throw new Error("submission success 상태를 시간 내에 확인하지 못했습니다.");
}

main().catch((err) => {
  console.error("❌ E2E 실패:", err.message || err);
  process.exit(1);
});
