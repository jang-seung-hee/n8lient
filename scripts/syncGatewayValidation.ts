// 이 파일은 Next.js의 공통 실행 유효성 검증 소스(src/common/validation/validateExecution.ts)를
// Gateway 프로젝트의 공유 소스 경로(n8lient-gateway/src/shared/validateExecution.ts)로 자동 복사해주는 빌드 타임 동기화 스크립트입니다.
// 한국어 주석 표준을 준수합니다.

import fs from "fs";
import path from "path";

const targetDir = path.resolve(__dirname, "../n8lient-gateway/src/shared");

const filesToSync = [
  {
    src: path.resolve(__dirname, "../src/common/validation/validateExecution.ts"),
    dest: "validateExecution.ts",
    comment: "Source: src/common/validation/validateExecution.ts"
  },
  {
    src: path.resolve(__dirname, "../src/common/knowledge/knowledgeSearchIndex.ts"),
    dest: "knowledgeSearchIndex.ts",
    comment: "Source: src/common/knowledge/knowledgeSearchIndex.ts"
  }
];

function syncFiles() {
  console.log("=========================================");
  console.log("🔄 Gateway Validation File Syncer Running");
  console.log("=========================================");

  try {
    // 대상 디렉토리가 없으면 재귀적으로 생성
    if (!fs.existsSync(targetDir)) {
      console.log(`[sync] 대상 디렉토리가 없어 새로 생성합니다: ${targetDir}`);
      fs.mkdirSync(targetDir, { recursive: true });
    }

    for (const item of filesToSync) {
      if (!fs.existsSync(item.src)) {
        throw new Error(`원본 검증 소스 파일이 존재하지 않습니다: ${item.src}`);
      }

      const sourceContent = fs.readFileSync(item.src, "utf-8");
      const autoGenComment = `// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
// ${item.comment}

`;
      const finalContent = autoGenComment + sourceContent;
      const targetPath = path.resolve(targetDir, item.dest);

      fs.writeFileSync(targetPath, finalContent, "utf-8");
      console.log(`✅ [sync] 성공적으로 파일을 복사 완료했습니다: ${targetPath}`);
    }
  } catch (err: any) {
    console.error("❌ [sync] 복사 동기화 중 오류가 발생했습니다:", err.message);
    process.exit(1);
  }
}

syncFiles();
