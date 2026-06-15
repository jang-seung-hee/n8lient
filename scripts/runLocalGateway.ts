// env.yaml 값을 로드한 뒤 로컬 Gateway(dev)를 기동하는 헬퍼 스크립트입니다.

import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const rootDir = process.cwd();
const envYamlPath = path.join(rootDir, "env.yaml");

if (!fs.existsSync(envYamlPath)) {
  console.error("env.yaml 파일이 없습니다.");
  process.exit(1);
}

const yamlText = fs.readFileSync(envYamlPath, "utf-8");
const pick = (key: string) => {
  const match = yamlText.match(new RegExp(`^${key}:\\s*\"([\\s\\S]*?)\"\\s*$`, "m"));
  return match?.[1]?.replace(/_NL_/g, "\n");
};

const env = {
  ...process.env,
  FIREBASE_ADMIN_PROJECT_ID: pick("FIREBASE_ADMIN_PROJECT_ID"),
  FIREBASE_ADMIN_CLIENT_EMAIL: pick("FIREBASE_ADMIN_CLIENT_EMAIL"),
  FIREBASE_ADMIN_PRIVATE_KEY: pick("FIREBASE_ADMIN_PRIVATE_KEY"),
  FIREBASE_STORAGE_BUCKET: pick("FIREBASE_STORAGE_BUCKET"),
  N8N_SERVER_MAIN_BASE_URL: pick("N8N_SERVER_MAIN_BASE_URL"),
  N8N_SERVER_MAIN_TOKEN: pick("N8N_SERVER_MAIN_TOKEN"),
  N8N_CALLBACK_SECRET: pick("N8N_CALLBACK_SECRET"),
  GATEWAY_BASE_URL: "http://localhost:8080",
  MAX_UPLOAD_MB: pick("MAX_UPLOAD_MB") || "10",
  ALLOWED_ORIGINS: pick("ALLOWED_ORIGINS") || "http://localhost:3000",
  PORT: process.env.PORT || "8080",
};

console.log("[runLocalGateway] n8lient-gateway dev 기동 (PORT=", env.PORT, ")");

const child = spawn("npm", ["run", "dev"], {
  cwd: path.join(rootDir, "n8lient-gateway"),
  env: env as NodeJS.ProcessEnv,
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 0));
