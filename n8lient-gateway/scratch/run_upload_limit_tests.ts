import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";

const gatewayDir = process.cwd(); // n8lient-gateway 디렉터리 기준
const envYamlPath = path.join(gatewayDir, "../env.yaml");
const dotEnvLocalPath = path.join(gatewayDir, "../.env.local");

// env.yaml 파싱
const yamlText = fs.readFileSync(envYamlPath, "utf-8");
const pickYaml = (key: string) => {
  const match = yamlText.match(new RegExp(`^${key}:\\s*\"([\\s\\S]*?)\"\\s*$`, "m"));
  return match?.[1]?.replace(/_NL_/g, "\n");
};

// .env.local 파싱
const dotEnvText = fs.readFileSync(dotEnvLocalPath, "utf-8");
const pickDotEnv = (key: string) => {
  const match = dotEnvText.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match?.[1]?.trim();
};

const projectId = pickYaml("FIREBASE_ADMIN_PROJECT_ID")!;
const clientEmail = pickYaml("FIREBASE_ADMIN_CLIENT_EMAIL")!;
const privateKey = pickYaml("FIREBASE_ADMIN_PRIVATE_KEY")!;
const apiKey = pickDotEnv("NEXT_PUBLIC_FIREBASE_API_KEY")!;

console.log("Firebase Init - ProjectId:", projectId);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

const db = admin.firestore();
const testUid = "28MCW8Vj6OgbuJJsOxaBxGzyDly2"; // 장승희 팀장 계정
const automationId = "beta_testing_company_n8lient-idea-catcher-0-9-0-0"; // 아이디어 캐치 0.9.0

// Custom Token을 ID Token으로 교환
async function getIdToken(uid: string): Promise<string> {
  console.log(`[ID Token] Custom Token 생성 중... UID: ${uid}`);
  const customToken = await admin.auth().createCustomToken(uid);
  
  console.log("[ID Token] REST API로 ID Token 교환 중...");
  const res = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
    token: customToken,
    returnSecureToken: true
  });
  
  return res.data.idToken;
}

// 개별 파일 업로드 테스트 전송
async function testUpload(idToken: string, filePath: string, targetUrl: string) {
  const fileName = path.basename(filePath);
  const fileStats = fs.statSync(filePath);
  const sizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
  
  console.log(`\n----------------------------------------`);
  console.log(`[테스트] 파일: ${fileName} (${sizeMB} MB)`);
  console.log(`[테스트] 대상 URL: ${targetUrl}`);
  
  const form = new FormData();
  const payload = {
    automationId: automationId,
    input: {
      title: `업로드 용량 한도 테스트 - ${fileName}`,
      titleProvided: true,
      titleSource: "user",
      text: "업로드 용량 제한 수정 E2E 검증 테스트 본문 내용입니다.",
      inputType: "audio"
    }
  };
  
  form.append("payload", JSON.stringify(payload));
  form.append("file_0", fs.createReadStream(filePath), {
    filename: fileName.replace(".txt", ".wav"),
    contentType: "audio/wav"
  });
  
  try {
    const startTime = Date.now();
    const response = await axios.post(targetUrl, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${idToken}`
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`[결과] 성공! HTTP STATUS: ${response.status} (소요 시간: ${duration}초)`);
    console.log(`[응답 데이터]:`, JSON.stringify(response.data, null, 2));
    
    if (response.data.submissionId) {
      // DB 상태 추적 확인
      await checkSubmissionDbStatus(response.data.submissionId);
    }
  } catch (error: any) {
    console.log(`[결과] 실패!`);
    if (error.response) {
      console.log(`[에러 HTTP STATUS]: ${error.response.status}`);
      console.log(`[에러 응답 데이터]:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(`[에러 메시지]: ${error.message}`);
    }
  }
}

// Firestore submissions 테이블에서 상태 변경 추적
async function checkSubmissionDbStatus(submissionId: string) {
  console.log(`[DB 조회] Firestore submissions ID: ${submissionId} 상태 조회 중...`);
  // n8n 비동기 callback 대기 등을 감안하여 3초 후 확인
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const snap = await db.collection("submissions").doc(submissionId).get();
  if (snap.exists) {
    const data = snap.data()!;
    console.log(`[DB 결과] status: ${data.status}, error:`, data.error);
  } else {
    console.log(`[DB 결과] submissions 문서가 Firestore에 존재하지 않습니다.`);
  }
}

async function run() {
  const idToken = await getIdToken(testUid);
  const dummy2mb = path.join(gatewayDir, "../scratch/dummy_2mb.txt");
  const dummy5mb = path.join(gatewayDir, "../scratch/dummy_5mb.txt");
  const dummy8mb = path.join(gatewayDir, "../scratch/dummy_8mb.txt");
  const dummy22mb = path.join(gatewayDir, "../scratch/dummy_22mb.txt");
  
  const gatewayUrl = "https://n8lient-gateway-769159846381.asia-northeast3.run.app/api/automation/execute";
  
  // 1. 2MB 테스트 (성공 예상)
  await testUpload(idToken, dummy2mb, gatewayUrl);
  
  // 2. 5MB 테스트 (성공 예상)
  await testUpload(idToken, dummy5mb, gatewayUrl);
  
  // 3. 8MB 테스트 (성공 예상)
  await testUpload(idToken, dummy8mb, gatewayUrl);
  
  // 4. 22MB 테스트 (실패 - 413 Payload Too Large / FILE_SIZE_EXCEEDED 예상)
  await testUpload(idToken, dummy22mb, gatewayUrl);
}

run().catch(console.error);
