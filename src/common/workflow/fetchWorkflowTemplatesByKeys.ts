// workflowKey 목록으로 workflowTemplates 문서를 batch 조회하는 공통 유틸입니다.

import { doc, getDoc, Firestore } from "firebase/firestore";
import type { WorkflowTemplate } from "@/types/n8lient";

/**
 * workflowKey별 workflowTemplates 문서를 조회해 map으로 반환합니다.
 */
export async function fetchWorkflowTemplatesByKeys(
  db: Firestore,
  workflowKeys: string[]
): Promise<Record<string, WorkflowTemplate>> {
  const uniqueKeys = [...new Set(workflowKeys.filter(Boolean))];
  const templates: Record<string, WorkflowTemplate> = {};

  await Promise.all(
    uniqueKeys.map(async (workflowKey) => {
      const snap = await getDoc(doc(db, "workflowTemplates", workflowKey));
      if (snap.exists()) {
        templates[workflowKey] = snap.data() as WorkflowTemplate;
      }
    })
  );

  return templates;
}
