import express, { Response } from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";
import { getAdminFirestore } from "./lib/firebase";
import { checkAuth, AuthenticatedRequest } from "./middleware/auth";

// .env 파일 로드 (로컬 개발용)
dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// CORS 설정
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim()) 
  : ["*"];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes("*")) {
      callback(null, true);
    } else {
      callback(new Error("CORS 정책에 의해 차단되었습니다."));
    }
  },
  credentials: true
}));

// JSON 및 URL-encoded 바디 파서
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer 임시 파일 저장소 설정 (/tmp 사용)
const upload = multer({
  dest: path.join(os.tmpdir(), "n8lient-uploads"),
  limits: {
    fileSize: parseInt(process.env.MAX_UPLOAD_MB || "10", 10) * 1024 * 1024
  }
});

/**
 * n8n Webhook URL 조립 헬퍼 함수
 */
function getWebhookConfig(serverKey: string, webhookSecretId: string): { url: string } | null {
  const serverEnvKey = serverKey.toUpperCase().replace(/-/g, "_");
  const webhookEnvKey = webhookSecretId.toUpperCase().replace(/-/g, "_");
  const baseUrl = process.env[`N8N_SERVER_${serverEnvKey}_BASE_URL`];
  const pathPart = process.env[`N8N_WEBHOOK_PATH_${webhookEnvKey}`];

  if (!baseUrl || !pathPart) {
    console.warn(`[getWebhookConfig] 환경변수 미설정: serverKey=${serverKey}, webhookSecretId=${webhookSecretId}`);
    return null;
  }
  const normalizedPath = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
  const url = `${baseUrl.replace(/\/$/, "")}${normalizedPath}`;
  return { url };
}

// 1. GET /health (헬스 체크)
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// 2. POST /api/automation/execute (자동화 실행 요청 접수 및 n8n 위임)
app.post("/api/automation/execute", checkAuth, upload.single("file_0"), async (req: AuthenticatedRequest, res: Response) => {
  const file = req.file;
  let submissionId = "";
  
  try {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(401).json({ success: false, error: "인증되지 않은 사용자입니다." });
    }

    // JSON body 파싱 (FormData 전송 시 payload 문자열로 래핑될 수 있음)
    let payloadData: any = {};
    if (req.body.payload) {
      try {
        payloadData = JSON.parse(req.body.payload);
      } catch (err) {
        return res.status(400).json({ success: false, error: "유효하지 않은 payload JSON 문자열입니다." });
      }
    } else {
      payloadData = req.body;
    }

    const { automationId, input } = payloadData;
    if (!automationId || !input || !input.title) {
      return res.status(400).json({ success: false, error: "필수 파라미터(automationId, input.title)가 누락되었습니다." });
    }

    const db = getAdminFirestore();

    // 1. 사용자 정보 및 승인 상태 검증
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) {
      return res.status(404).json({ success: false, error: "사용자 정보를 찾을 수 없습니다." });
    }
    const userDoc = userSnap.data()!;
    if (userDoc.approvalStatus !== "approved") {
      return res.status(403).json({ success: false, error: "승인 완료된 사용자만 실행 요청이 가능합니다." });
    }
    const clientId = userDoc.clientId;

    // 2. clientAutomations/{automationId} 검증
    const autoSnap = await db.collection("clientAutomations").doc(automationId).get();
    if (!autoSnap.exists) {
      return res.status(404).json({ success: false, error: "자동화 설정을 찾을 수 없습니다." });
    }
    const autoDoc = autoSnap.data()!;
    if (autoDoc.clientId !== clientId) {
      return res.status(403).json({ success: false, error: "접근 권한이 없는 자동화 설정입니다." });
    }
    if (!autoDoc.enabled) {
      return res.status(400).json({ success: false, error: "비활성화 상태의 자동화입니다." });
    }
    if (autoDoc.configStatus !== "configured") {
      return res.status(400).json({ success: false, error: "설정이 미완료된 자동화입니다." });
    }

    const workflowKey = autoDoc.workflowKey;
    const companySettings = autoDoc.settings || {};

    // 3. userAutomationSettings 개인 설정 조회 및 병합
    const finalSettings = { ...companySettings };
    const userSettingId = `${uid}_${automationId}`;
    const userSettingSnap = await db.collection("userAutomationSettings").doc(userSettingId).get();
    let hasUserSetting = false;
    const mergedKeys: string[] = [];

    if (userSettingSnap.exists) {
      const userSettingDoc = userSettingSnap.data()!;
      const isValid = (!userSettingDoc.uid || userSettingDoc.uid === uid) &&
                      (!userSettingDoc.clientId || userSettingDoc.clientId === clientId) &&
                      (!userSettingDoc.automationId || userSettingDoc.automationId === automationId) &&
                      (!userSettingDoc.workflowKey || userSettingDoc.workflowKey === workflowKey);

      if (isValid) {
        hasUserSetting = true;
        for (const [key, val] of Object.entries(userSettingDoc.settings || {})) {
          const isInvalid = val === null || val === undefined || (typeof val === "string" && val.trim() === "");
          if (!isInvalid) {
            finalSettings[key] = val;
            mergedKeys.push(key);
          }
        }
      }
    }
    const fallbackKeys = Object.keys(finalSettings).filter((k) => !mergedKeys.includes(k));
    const settingsMergeSummary = { hasUserSetting, mergedKeys, fallbackKeys };

    // 4. workflowTemplates 조회 및 n8n Webhook 정보 획득
    const templateSnap = await db.collection("workflowTemplates").doc(workflowKey).get();
    if (!templateSnap.exists) {
      return res.status(404).json({ success: false, error: "자동화 명세(Template)를 찾을 수 없습니다." });
    }
    const templateDoc = templateSnap.data()!;
    const n8nServerKey = templateDoc.n8nServerKey || "main";
    const webhookSecretId = templateDoc.webhookSecretId || workflowKey;

    const webhookConfig = getWebhookConfig(n8nServerKey, webhookSecretId);
    if (!webhookConfig) {
      return res.status(500).json({ success: false, error: "n8n Webhook 연동 정보가 서버에 설정되지 않았습니다." });
    }

    // 5. submissions 문서 queued 상태로 생성 (사전 등록)
    const now = new Date();
    const dateStr = now.toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
    const randomStr = Math.random().toString(36).substring(2, 8);
    submissionId = `sub_${dateStr}_${randomStr}`;

    // 파일 메타데이터 준비
    const fileMetadata = file ? {
      fileName: file.originalname || "attached_file",
      mimeType: file.mimetype || "application/octet-stream",
      sizeBytes: file.size,
      inputType: input.inputType || "file"
    } : null;

    const submissionData = {
      submissionId,
      clientId,
      uid,
      workflowKey,
      automationId,
      status: "queued",
      input: {
        title: input.title,
        text: input.text || null,
        fileUrl: null,
        fileName: fileMetadata?.fileName || null,
        mimeType: fileMetadata?.mimeType || null,
        sizeBytes: fileMetadata?.sizeBytes || null,
        inputType: fileMetadata?.inputType || null,
      },
      result: { resultUrl: null, summary: null },
      error: { code: null, message: null },
      retryOf: null,
      settingsMergeSummary,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      completedAt: null,
    };
    await db.collection("submissions").doc(submissionId).set(submissionData);

    // 6. n8n Webhook 서버 간 요청 전송
    const gatewayBaseUrl = process.env.GATEWAY_BASE_URL || "http://localhost:8080";
    const n8nPayload = {
      submissionId,
      clientId,
      uid,
      workflowKey,
      automationId,
      settings: finalSettings,
      input: submissionData.input,
      requestedAt: now.toISOString(),
      callbackUrl: `${gatewayBaseUrl.replace(/\/$/, "")}/api/automation/callback`,
    };

    const n8nServerToken = process.env[`N8N_SERVER_${n8nServerKey.toUpperCase().replace(/-/g, "_")}_TOKEN`] || "";

    const form = new FormData();
    form.append("submissionId", submissionId);
    form.append("payload", JSON.stringify(n8nPayload));
    
    if (file) {
      // 로컬 디렉토리의 임시 파일을 읽어 n8n으로 파이프 전송
      form.append("file_0", fs.createReadStream(file.path), {
        filename: file.originalname,
        contentType: file.mimetype,
      });
    }

    const n8nHeaders = {
      ...form.getHeaders(),
      "X-N8N-TOKEN": n8nServerToken,
    };

    console.log(`[execute] n8n Webhook 호출 시작. URL: ${webhookConfig.url}`);
    
    // axios를 사용하여 n8n 호출 실행
    const n8nResponse = await axios.post(webhookConfig.url, form, {
      headers: n8nHeaders,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 120000 // 2분 타임아웃
    });

    if (n8nResponse.status >= 200 && n8nResponse.status < 300) {
      console.log(`[execute] n8n Webhook 호출 성공. Status: ${n8nResponse.status}`);
      return res.status(200).json({ success: true, submissionId });
    } else {
      throw new Error(`n8n 서버 응답 실패 (HTTP ${n8nResponse.status})`);
    }

  } catch (error: any) {
    console.error("[execute] 처리 중 에러 발생:", error);
    
    // 에러 발생 시 submissions 상태 failed로 업데이트 (고착 방지)
    if (submissionId) {
      try {
        const db = getAdminFirestore();
        await db.collection("submissions").doc(submissionId).update({
          status: "failed",
          updatedAt: new Date().toISOString(),
          error: {
            code: "GATEWAY_EXECUTE_FAILED",
            message: error.message || "게이트웨이 통신 실패"
          }
        });
      } catch (dbErr) {
        console.error("[execute] 에러 마킹 업데이트 실패:", dbErr);
      }
    }

    return res.status(500).json({ success: false, error: `실행 실패: ${error.message}` });
  } finally {
    // 7. 임시 파일 영구 삭제
    if (file && fs.existsSync(file.path)) {
      fs.promises.unlink(file.path).catch(err => {
        console.error(`[execute] 임시 파일 제거 실패: path=${file.path}`, err);
      });
    }
  }
});

// 3. POST /api/automation/callback (n8n 완료 콜백 수신 및 submission 결과 갱신)
app.post("/api/automation/callback", async (req, res) => {
  try {
    // 1. Authorization: Bearer N8N_CALLBACK_SECRET 보안 검증
    const authHeader = req.headers.authorization;
    const callbackSecret = process.env.N8N_CALLBACK_SECRET;
    
    if (!authHeader || !authHeader.startsWith("Bearer ") || !callbackSecret) {
      return res.status(401).json({ success: false, error: "인증 자격증명이 없거나 유효하지 않습니다." });
    }
    
    const receivedSecret = authHeader.replace("Bearer ", "");
    if (receivedSecret !== callbackSecret) {
      return res.status(401).json({ success: false, error: "잘못된 Callback Secret 자격증명입니다." });
    }

    const { submissionId, status, result, error } = req.body;
    if (!submissionId || !status) {
      return res.status(400).json({ success: false, error: "필수 파라미터가 누락되었습니다." });
    }

    const db = getAdminFirestore();
    const docRef = db.collection("submissions").doc(submissionId);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: "해당 실행 이력(submission)을 찾을 수 없습니다." });
    }

    // 2. 최종 상태(success/failed) 및 메타데이터 업데이트
    const updateData: any = {
      status: status === "success" ? "success" : "failed",
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    if (status === "success") {
      updateData.result = {
        resultUrl: result?.resultUrl || null,
        summary: result?.summary || null,
      };
    } else {
      updateData.error = {
        code: error?.code || "N8N_WORKFLOW_FAILED",
        message: error?.message || "n8n 워크플로우 수행 오류",
      };
    }

    await docRef.update(updateData);
    console.log(`[callback] submissionId=${submissionId} 업데이트 완료. Status: ${updateData.status}`);
    
    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error("[callback] 처리 중 서버 오류:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 서버 가동
app.listen(port, () => {
  console.log(`[n8lient-gateway] 서버가 포트 ${port}에서 정상 기동 중입니다.`);
});
