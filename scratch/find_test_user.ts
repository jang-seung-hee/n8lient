import admin from "firebase-admin";
import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const envYamlPath = path.join(rootDir, "env.yaml");

const yamlText = fs.readFileSync(envYamlPath, "utf-8");
const pick = (key: string) => {
  const match = yamlText.match(new RegExp(`^${key}:\\s*\"([\\s\\S]*?)\"\\s*$`, "m"));
  return match?.[1]?.replace(/_NL_/g, "\n");
};

const projectId = pick("FIREBASE_ADMIN_PROJECT_ID");
const clientEmail = pick("FIREBASE_ADMIN_CLIENT_EMAIL");
const privateKey = pick("FIREBASE_ADMIN_PRIVATE_KEY");

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

async function run() {
  console.log("=== Firestore 테스트 유저 및 자동화 정보 조회 ===");
  
  // 1. 승인된 유저 목록 조회
  const usersSnap = await db.collection("users")
    .where("approvalStatus", "==", "approved")
    .limit(5)
    .get();
    
  if (usersSnap.empty) {
    console.log("승인된 유저를 찾지 못했습니다.");
    return;
  }
  
  console.log("승인된 유저 목록:");
  const users = usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
  console.log(JSON.stringify(users, null, 2));
  
  const testUser = users[0];
  
  // 2. 해당 유저의 회사에 할당된 clientAutomations 조회
  const autosSnap = await db.collection("clientAutomations")
    .where("clientId", "==", testUser.clientId)
    .where("enabled", "==", true)
    .get();
    
  console.log("\n회사 활성 자동화 목록:");
  const autos = autosSnap.docs.map(doc => ({ automationId: doc.id, ...doc.data() }));
  console.log(JSON.stringify(autos, null, 2));
}

run().catch(console.error);
