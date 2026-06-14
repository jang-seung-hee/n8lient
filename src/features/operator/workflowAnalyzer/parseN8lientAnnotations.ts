// n8n 워크플로우 JSON 내부에 작성된 N8Lient 등록 주석 메타데이터를 파싱하는 서비스 모듈입니다.
// 한국어 주석 표준을 준수합니다.

import type { ConfigSchemaField } from "@/types/n8lient";

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
  configFields: Array<ConfigSchemaField & { [key: string]: any }>;
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
  unknownFields: string[];
}

const SENSITIVE_KEYWORDS = [
  "token",
  "secret",
  "credential",
  "credentialid",
  "accesstoken",
  "refreshtoken",
  "privatekey",
  "apikey",
  "api_key",
  "password",
  "serviceaccount",
  "clientsecret",
  "authorization",
  "bearer",
  "cookie",
  "firebaseadmin",
];

const VALID_WORKFLOW_META_KEYS = [
  "name",
  "shortname",
  "description",
  "titlerequired",
  "acceptedinputtypes",
  "allowedextensions",
  "maxfilesizemb",
];

const VALID_CONFIG_FIELD_KEYS = [
  "key",
  "label",
  "inputtype",
  "type",
  "required",
  "placeholder",
  "description",
  "options",
];

const VALID_RETENTION_POLICY_KEYS = [
  "supportedlevels",
  "maxlevel",
  "defaultlevel",
  "supportsprocessorresult",
  "supportsoriginalfilerefs",
  "supportsresultrefs",
  "supportsresultpolicyrouter",
  "allowedlevels",
  "operatordefaultlevel",
  "allowcompanyoverride",
  "allowuseroverride",
];

/**
 * n8n JSON에서 Sticky Note 또는 텍스트 주석 블록들을 찾아 파싱합니다.
 * @param workflowJson n8n 워크플로우 JSON 객체
 */
export function parseN8lientAnnotations(workflowJson: unknown): ParsedAnnotations {
  const result: ParsedAnnotations = {
    configFields: [],
    unknownFields: [],
  };

  if (!workflowJson || typeof workflowJson !== "object") {
    return result;
  }

  const rawObj = workflowJson as any;
  const textsToScan: string[] = [];

  // 1. 최상위 notes 및 description 검사
  if (typeof rawObj.notes === "string" && rawObj.notes) textsToScan.push(rawObj.notes);
  if (typeof rawObj.description === "string" && rawObj.description) textsToScan.push(rawObj.description);

  // 2. nodes 루프 돌며 텍스트 수집
  const nodes = Array.isArray(rawObj.nodes) ? rawObj.nodes : [];
  for (const node of nodes) {
    if (node.notes && typeof node.notes === "string") {
      textsToScan.push(node.notes);
    }
    const params = node.parameters;
    if (params) {
      if (typeof params.content === "string" && params.content) textsToScan.push(params.content);
      if (typeof params.note === "string" && params.note) textsToScan.push(params.note);
      if (typeof params.text === "string" && params.text) textsToScan.push(params.text);
    }
  }

  // 병합된 단일 텍스트
  const mergedText = textsToScan.join("\n\n");

  // 3. 주석 블록 정규식 매칭 (대소문자 무관)
  const metaRegex = /\[N8LIENT_WORKFLOW_META\]([\s\S]*?)\[\/N8LIENT_WORKFLOW_META\]/gi;
  const configRegex = /\[N8LIENT_CONFIG_FIELD\]([\s\S]*?)\[\/N8LIENT_CONFIG_FIELD\]/gi;
  const retentionRegex = /\[N8LIENT_RETENTION_POLICY\]([\s\S]*?)\[\/N8LIENT_RETENTION_POLICY\]/gi;

  // 3.1 WORKFLOW_META 파싱
  let metaMatch;
  while ((metaMatch = metaRegex.exec(mergedText)) !== null) {
    if (metaMatch[1]) {
      const parsed = parseKeyValuePairBlock(metaMatch[1]);
      const workflowMeta: Record<string, any> = {};

      for (const [k, v] of Object.entries(parsed)) {
        const lowerK = k.toLowerCase();
        if (!VALID_WORKFLOW_META_KEYS.includes(lowerK)) {
          result.unknownFields.push(`workflowMeta.${k}`);
        }

        // 특정 타입 변환
        if (lowerK === "titlerequired") {
          workflowMeta.titleRequired = parseBoolean(v);
        } else if (lowerK === "maxfilesizemb") {
          workflowMeta.maxFileSizeMB = parseInt(v, 10) || 50;
        } else if (lowerK === "acceptedinputtypes") {
          workflowMeta.acceptedInputTypes = parseArray(v);
        } else if (lowerK === "allowedextensions") {
          workflowMeta.allowedExtensions = parseArray(v);
        } else {
          // name, shortName, description 등
          // 캐멀케이스 매핑
          const targetKey = k === "shortName" ? "shortName" : k;
          workflowMeta[targetKey] = v;
        }
      }

      result.workflowMeta = workflowMeta;
    }
  }

  // 3.2 CONFIG_FIELD 파싱
  let configMatch;
  while ((configMatch = configRegex.exec(mergedText)) !== null) {
    if (configMatch[1]) {
      const parsed = parseKeyValuePairBlock(configMatch[1]);
      const configField: Record<string, any> = {};

      for (const [k, v] of Object.entries(parsed)) {
        const lowerK = k.toLowerCase();
        if (!VALID_CONFIG_FIELD_KEYS.includes(lowerK)) {
          result.unknownFields.push(`configSchema[].${k}`);
        }

        if (lowerK === "required") {
          configField.required = parseBoolean(v);
        } else if (lowerK === "options") {
          configField.options = parseArray(v);
        } else if (lowerK === "inputtype" || lowerK === "type") {
          configField.type = v; // inputType도 type으로 바인딩
        } else {
          configField[k] = v;
        }
      }

      // 민감 키워드가 key에 포함된 경우 보안상 configSchema 반영 배제 (차단)
      const fieldKey = configField.key?.trim() || "";
      const isSensitive = SENSITIVE_KEYWORDS.some((kw) => fieldKey.toLowerCase().includes(kw));
      if (isSensitive && fieldKey) {
        result.unknownFields.push(`[Security-Blocked] configSchema.${fieldKey} (민감 정보 차단)`);
        continue;
      }

      if (fieldKey) {
        result.configFields.push(configField as ConfigSchemaField);
      }
    }
  }

  // 3.3 RETENTION_POLICY 파싱
  let retentionMatch;
  while ((retentionMatch = retentionRegex.exec(mergedText)) !== null) {
    if (retentionMatch[1]) {
      const parsed = parseKeyValuePairBlock(retentionMatch[1]);
      const policy: Record<string, any> = {};

      for (const [k, v] of Object.entries(parsed)) {
        const lowerK = k.toLowerCase();
        if (!VALID_RETENTION_POLICY_KEYS.includes(lowerK)) {
          result.unknownFields.push(`retentionPolicy.${k}`);
        }

        // boolean 변환
        if (
          lowerK === "supportsprocessorresult" ||
          lowerK === "supportsoriginalfilerefs" ||
          lowerK === "supportsresultrefs" ||
          lowerK === "supportsresultpolicyrouter" ||
          lowerK === "allowcompanyoverride" ||
          lowerK === "allowuseroverride"
        ) {
          policy[k] = parseBoolean(v);
        } else if (lowerK === "supportedlevels" || lowerK === "allowedlevels") {
          policy[k] = parseArray(v);
        } else {
          policy[k] = v;
        }
      }

      result.retentionPolicy = policy;
    }
  }

  return result;
}

/**
 * 줄 단위 key=value 텍스트 블록을 파싱하여 객체로 반환합니다.
 */
function parseKeyValuePairBlock(blockText: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = blockText.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) {
      continue;
    }

    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key) {
        result[key] = val;
      }
    }
  }

  return result;
}

function parseBoolean(valStr: string): boolean {
  return valStr.trim().toLowerCase() === "true";
}

function parseArray(valStr: string): string[] {
  return valStr
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}
