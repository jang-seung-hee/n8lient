// n8n JSON 내부의 Sticky Note와 노드별 설명 주석에서 N8Lient 명세 메타데이터를 정밀 파싱하는 모듈입니다.
// 한국어 주석 표준을 준수합니다.

export interface ParsedAnnotations {
  workflowMeta?: {
    name?: string;
    shortName?: string;
    description?: string;
    titleRequired?: boolean;
    acceptedInputTypes?: string[];
    allowedExtensions?: string[];
    maxFileSizeMB?: number;
    [key: string]: any;
  };
  configFields: Array<{
    key: string;
    label?: string;
    inputType?: string;
    required?: boolean;
    placeholder?: string;
    description?: string;
    options?: string[];
    [key: string]: any;
  }>;
  retentionPolicy?: {
    supportedLevels?: string[];
    maxLevel?: string;
    defaultLevel?: string;
    supportsProcessorResult?: boolean;
    supportsOriginalFileRefs?: boolean;
    supportsResultRefs?: boolean;
    supportsResultPolicyRouter?: boolean;
    allowedLevels?: string[];
    operatorDefaultLevel?: string;
    allowCompanyOverride?: boolean;
    allowUserOverride?: boolean;
    [key: string]: any;
  };
  unknownFields: string[]; // 파싱 과정에서 인지하지 못한 형식 오류나 키 기록
}

/**
 * n8n 워크플로우 JSON 데이터를 통째로 스캔하여 포함된 N8Lient 주석 텍스트를 추출하고 객체 구조로 파싱합니다.
 * @param workflowJson n8n 워크플로우 JSON
 */
export function parseN8lientAnnotations(workflowJson: unknown): ParsedAnnotations {
  const result: ParsedAnnotations = {
    configFields: [],
    unknownFields: [],
  };

  if (!workflowJson || typeof workflowJson !== "object") {
    return result;
  }

  // 1. 모든 텍스트 포함 가능성이 있는 속성 스캔 및 병합
  const rawObj = workflowJson as any;
  const rawTexts: string[] = [];

  // 최상위 정보 수집
  if (typeof rawObj.description === "string") rawTexts.push(rawObj.description);
  if (Array.isArray(rawObj.notes)) {
    rawObj.notes.forEach((n: any) => {
      if (typeof n === "string") rawTexts.push(n);
      else if (n && typeof n.content === "string") rawTexts.push(n.content);
    });
  }

  // 노드 단위 정보 수집
  const nodes = Array.isArray(rawObj.nodes) ? rawObj.nodes : [];
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;

    // notes 속성
    if (typeof node.notes === "string") {
      rawTexts.push(node.notes);
    }
    
    // parameters 내의 note, content, text 등
    const params = node.parameters;
    if (params && typeof params === "object") {
      if (typeof params.content === "string") rawTexts.push(params.content);
      if (typeof params.note === "string") rawTexts.push(params.note);
      if (typeof params.text === "string") rawTexts.push(params.text);
    }

    // stickyNote 노드 감지
    const isSticky = node.type === "n8n-nodes-base.stickyNote" || String(node.type).includes("stickyNote");
    if (isSticky && params && typeof params === "object") {
      if (typeof params.content === "string") rawTexts.push(params.content);
    }
  }

  // 텍스트 하나로 병합
  const fullText = rawTexts.join("\n");

  // 2. 블록 단위 추출 정규식
  const workflowMetaRegex = /\[N8LIENT_WORKFLOW_META\]([\s\S]*?)\[\/N8LIENT_WORKFLOW_META\]/gi;
  const configFieldRegex = /\[N8LIENT_CONFIG_FIELD\]([\s\S]*?)\[\/N8LIENT_CONFIG_FIELD\]/gi;
  const retentionPolicyRegex = /\[N8LIENT_RETENTION_POLICY\]([\s\S]*?)\[\/N8LIENT_RETENTION_POLICY\]/gi;

  // 헬퍼: key=value 라인 파싱
  const parseBlockLines = (blockText: string): Record<string, string> => {
    const lines = blockText.split("\n");
    const data: Record<string, string> = {};

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith("#") || trimmedLine.startsWith("//")) continue;

      const equalIdx = trimmedLine.indexOf("=");
      if (equalIdx === -1) continue;

      const key = trimmedLine.substring(0, equalIdx).trim();
      const val = trimmedLine.substring(equalIdx + 1).trim();
      if (key) {
        data[key] = val;
      }
    }
    return data;
  };

  // 3. WORKFLOW_META 파싱
  let metaMatch;
  while ((metaMatch = workflowMetaRegex.exec(fullText)) !== null) {
    if (metaMatch[1]) {
      const kv = parseBlockLines(metaMatch[1]);
      const meta: ParsedAnnotations["workflowMeta"] = {};

      for (const [k, v] of Object.entries(kv)) {
        if (k === "name" || k === "shortName" || k === "description") {
          meta[k] = v;
        } else if (k === "titleRequired") {
          meta[k] = v.toLowerCase() === "true";
        } else if (k === "maxFileSizeMB") {
          const num = parseInt(v, 10);
          meta[k] = isNaN(num) ? 50 : num;
        } else if (k === "acceptedInputTypes" || k === "allowedExtensions") {
          meta[k] = v.split(",").map((x) => x.trim()).filter(Boolean);
        } else {
          meta[k] = v;
          result.unknownFields.push(`[WORKFLOW_META] 정의되지 않은 설정 키 발견: ${k}=${v}`);
        }
      }
      result.workflowMeta = meta;
    }
  }

  // 4. CONFIG_FIELD 파싱 (다중 블록)
  let fieldMatch;
  while ((fieldMatch = configFieldRegex.exec(fullText)) !== null) {
    if (fieldMatch[1]) {
      const kv = parseBlockLines(fieldMatch[1]);
      const key = kv.key || "";
      if (!key) {
        result.unknownFields.push("[CONFIG_FIELD] 'key' 식별자가 없는 설정 주석 블록이 무시되었습니다.");
        continue;
      }

      const field: any = { key };
      for (const [k, v] of Object.entries(kv)) {
        if (k === "key") continue;

        if (k === "label" || k === "inputType" || k === "placeholder" || k === "description") {
          field[k] = v;
        } else if (k === "required") {
          field[k] = v.toLowerCase() === "true";
        } else if (k === "options") {
          field[k] = v.split(",").map((x) => x.trim()).filter(Boolean);
        } else {
          field[k] = v;
          result.unknownFields.push(`[CONFIG_FIELD:${key}] 정의되지 않은 필드 속성 키 발견: ${k}=${v}`);
        }
      }
      result.configFields.push(field);
    }
  }

  // 5. RETENTION_POLICY 파싱
  let policyMatch;
  while ((policyMatch = retentionPolicyRegex.exec(fullText)) !== null) {
    if (policyMatch[1]) {
      const kv = parseBlockLines(policyMatch[1]);
      const policy: ParsedAnnotations["retentionPolicy"] = {};

      for (const [k, v] of Object.entries(kv)) {
        if (
          k === "maxLevel" ||
          k === "defaultLevel" ||
          k === "operatorDefaultLevel"
        ) {
          policy[k] = v as any;
        } else if (
          k === "supportsProcessorResult" ||
          k === "supportsOriginalFileRefs" ||
          k === "supportsResultRefs" ||
          k === "supportsResultPolicyRouter" ||
          k === "allowCompanyOverride" ||
          k === "allowUserOverride"
        ) {
          policy[k] = v.toLowerCase() === "true";
        } else if (k === "supportedLevels" || k === "allowedLevels") {
          policy[k] = v.split(",").map((x) => x.trim()) as any[];
        } else {
          policy[k] = v;
          result.unknownFields.push(`[RETENTION_POLICY] 정의되지 않은 설정 키 발견: ${k}=${v}`);
        }
      }
      result.retentionPolicy = policy;
    }
  }

  return result;
}
