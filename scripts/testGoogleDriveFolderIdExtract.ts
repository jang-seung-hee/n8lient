// Google Drive folderId 추출 유틸 smoke test

import {
  extractGoogleDriveFolderId,
  normalizeGoogleDriveFolderIdInput,
} from "../src/common/googleDrive/extractGoogleDriveFolderId";

const SAMPLE_ID = "1aBcDeFgHiJkLmNoPqRs";

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean) {
  if (cond) {
    console.log(`✅ ${name}`);
    pass++;
  } else {
    console.error(`❌ ${name}`);
    fail++;
  }
}

const pure = normalizeGoogleDriveFolderIdInput(SAMPLE_ID);
assert("순수 ID", pure.ok && !pure.isEmpty && pure.folderId === SAMPLE_ID);

const url1 = normalizeGoogleDriveFolderIdInput(
  `https://drive.google.com/drive/u/0/folders/${SAMPLE_ID}`
);
assert("drive/u/0/folders URL", url1.ok && url1.folderId === SAMPLE_ID && url1.extractedFromUrl);

const url2 = normalizeGoogleDriveFolderIdInput(
  `https://drive.google.com/drive/folders/${SAMPLE_ID}?usp=sharing`
);
assert("drive/folders URL", url2.ok && url2.folderId === SAMPLE_ID);

const url3 = normalizeGoogleDriveFolderIdInput(
  `https://drive.google.com/open?id=${SAMPLE_ID}`
);
assert("open?id URL", url3.ok && url3.folderId === SAMPLE_ID);

const empty = normalizeGoogleDriveFolderIdInput("   ", { allowEmpty: true });
assert("빈 값 allowEmpty", empty.ok && empty.isEmpty);

const bad = normalizeGoogleDriveFolderIdInput("bad-id");
assert("잘못된 ID 거부", !bad.ok);

const ext = extractGoogleDriveFolderId(`https://drive.google.com/drive/folders/${SAMPLE_ID}`);
assert("extract URL", ext.folderId === SAMPLE_ID && ext.extractedFromUrl);

console.log(`\n결과: ${pass} 통과, ${fail} 실패`);
process.exit(fail > 0 ? 1 : 0);
