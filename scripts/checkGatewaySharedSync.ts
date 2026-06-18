// 이 파일은 App의 원본 검증 소스(src/common/validation/validateExecution.ts)와
// Gateway의 복사본(n8lient-gateway/src/shared/validateExecution.ts)이 일치하는지 검사합니다.
// 불일치할 경우 빌드 프로세스를 중단시켜 배포 사고를 방지합니다.
// 한국어 주석 표준을 준수합니다.

import fs from "fs";
import path from "path";

const sourcePath = path.resolve(__dirname, "../src/common/validation/validateExecution.ts");
const targetPath = path.resolve(__dirname, "../n8lient-gateway/src/shared/validateExecution.ts");

function checkSync() {
  console.log("=========================================");
  console.log("🔍 Gateway Shared File Sync Check");
  console.log("=========================================");

  try {
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`원본 검증 소스 파일이 존재하지 않습니다: ${sourcePath}`);
    }

    if (!fs.existsSync(targetPath)) {
      console.error("❌ [check] 동기화된 파일이 존재하지 않습니다. 'npm run sync:gateway'를 먼저 실행하세요.");
      process.exit(1);
    }

    const sourceContent = fs.readFileSync(sourcePath, "utf-8");
    const targetContent = fs.readFileSync(targetPath, "utf-8");

    // 자동 생성 주석을 제외한 실제 내용이 포함되어 있는지 확인
    // syncGatewayValidation.ts에서 추가하는 주석 패턴을 고려하여 비교
    if (!targetContent.includes(sourceContent)) {
      console.error("❌ [check] Gateway의 shared 파일이 원본과 일치하지 않습니다. 다시 동기화가 필요합니다.");
      console.error("실행 명령: npm run sync:gateway");
      process.exit(1);
    }

    console.log("✅ [check] Gateway shared 파일 동기화 상태 정상");
  } catch (err: any) {
    console.error("❌ [check] 동기화 확인 중 오류가 발생했습니다:", err.message);
    process.exit(1);
  }
}

checkSync();
