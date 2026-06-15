// 운영 n8n 인스턴스에 아이디어 캐처 v1.02 워크플로우 JSON을 import/update하는 스크립트입니다.
// 사용법: N8N_API_KEY=... npx tsx scripts/importN8nIdeaCatcherWorkflow.ts

import fs from "fs";
import path from "path";

const WORKFLOW_FILE = path.resolve(
  process.cwd(),
  ".n8n-workflows/아이디어 캐처/N8Lient 아이디어 캐처 v1.02 - 직접 업로드 토큰 검증 반영.json"
);

const N8N_BASE_URL = process.env.N8N_BASE_URL || "https://n8n.rentaltalk.kr";
const N8N_API_KEY = process.env.N8N_API_KEY;

async function readJsonResponse(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function main() {
  if (!N8N_API_KEY) {
    throw new Error(
      "N8N_API_KEY 환경변수가 필요합니다. n8n UI > Settings > API에서 발급 후 실행하세요."
    );
  }

  if (!fs.existsSync(WORKFLOW_FILE)) {
    throw new Error(`워크플로우 JSON 파일을 찾을 수 없습니다: ${WORKFLOW_FILE}`);
  }

  const raw = JSON.parse(fs.readFileSync(WORKFLOW_FILE, "utf-8"));
  const workflowName = raw.name as string;

  const headers = {
    "X-N8N-API-KEY": N8N_API_KEY,
    "Content-Type": "application/json",
  };

  const listRes = await fetch(`${N8N_BASE_URL}/api/v1/workflows`, { headers });
  const listBody = await readJsonResponse(listRes);

  if (!listRes.ok) {
    throw new Error(`n8n workflow list 실패 (${listRes.status}): ${JSON.stringify(listBody)}`);
  }

  const workflows = (listBody as { data?: unknown[] }).data || listBody || [];
  const existing = (workflows as Array<{ id?: string; name?: string }>).find((w) => w.name === workflowName);

  const payload = {
    name: raw.name,
    nodes: raw.nodes,
    connections: raw.connections,
    settings: raw.settings || {},
    staticData: raw.staticData || null,
  };

  let resultRes: Response;
  if (existing?.id) {
    console.log(`기존 워크플로우 업데이트: id=${existing.id}, name=${workflowName}`);
    resultRes = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${existing.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
    });
  } else {
    console.log(`신규 워크플로우 생성: name=${workflowName}`);
    resultRes = await fetch(`${N8N_BASE_URL}/api/v1/workflows`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  }

  const resultBody = await readJsonResponse(resultRes);
  if (!resultRes.ok) {
    throw new Error(`n8n workflow import 실패 (${resultRes.status}): ${JSON.stringify(resultBody)}`);
  }

  const workflowId = (resultBody as { id?: string; data?: { id?: string } }).id || (resultBody as { data?: { id?: string } }).data?.id;
  console.log(`✅ n8n workflow import/update 완료: id=${workflowId}`);

  if (workflowId) {
    const activateRes = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${workflowId}/activate`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    const activateBody = await readJsonResponse(activateRes);

    if (!activateRes.ok) {
      console.warn(`⚠️ activate 실패 (${activateRes.status}): ${JSON.stringify(activateBody)}`);
      console.warn("n8n UI에서 수동으로 Active 전환을 확인하세요.");
    } else {
      console.log("✅ workflow activate 완료");
    }
  }
}

main().catch((err) => {
  console.error("❌ n8n import 실패:", err.message || err);
  process.exit(1);
});
