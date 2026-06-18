"use client";

// 목록 화면용 uid → 실행자 라벨 일괄 조회

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { getUserDoc } from "@/features/auth/authUserService";
import {
  formatUserListActorLabel,
  resolveSubmissionActorDisplaySource,
} from "@/common/user/formatUserDisplayName";
import type { Submission } from "@/types/n8lient";

/** uid 목록에 대해 users 문서를 조회해 목록용 실행자 라벨 맵을 반환합니다. */
export function useSubmissionActorLabelMap(
  submissions: Submission[]
): Record<string, string> {
  const [labelMap, setLabelMap] = useState<Record<string, string>>({});

  const uidKey = submissions
    .map((s) => s.uid)
    .filter(Boolean)
    .sort()
    .join("|");

  useEffect(() => {
    if (submissions.length === 0) {
      setLabelMap({});
      return;
    }

    let cancelled = false;
    const uniqueUids = [...new Set(submissions.map((s) => s.uid).filter(Boolean))];

    Promise.all(
      uniqueUids.map(async (uid) => {
        const submission = submissions.find((s) => s.uid === uid)!;
        const fallbackLabel = formatUserListActorLabel(
          resolveSubmissionActorDisplaySource(submission)
        );

        try {
          const userDoc = await getUserDoc(db, uid);
          if (cancelled) return [uid, fallbackLabel] as const;

          const label = userDoc
            ? formatUserListActorLabel({
                displayName: userDoc.displayName,
                email: userDoc.email,
                uid: userDoc.uid,
              })
            : fallbackLabel;

          return [uid, label] as const;
        } catch {
          return [uid, fallbackLabel] as const;
        }
      })
    ).then((entries) => {
      if (!cancelled) {
        setLabelMap(Object.fromEntries(entries));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [uidKey]);

  return labelMap;
}
