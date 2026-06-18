"use client";

// submission 실행자(uid) 기준 users 문서 조회 후 표시용 UserDisplaySource 반환

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { getUserDoc } from "@/features/auth/authUserService";
import type { Submission } from "@/types/n8lient";
import type { UserDisplaySource } from "@/common/user/formatUserDisplayName";

export function useSubmissionActorDisplaySource(
  submission: Submission | null
): UserDisplaySource | null {
  const [source, setSource] = useState<UserDisplaySource | null>(null);

  useEffect(() => {
    if (!submission) {
      setSource(null);
      return;
    }

    let cancelled = false;
    const { uid } = submission;

    getUserDoc(db, uid)
      .then((doc) => {
        if (cancelled) return;
        if (doc) {
          setSource({
            displayName: doc.displayName,
            email: doc.email,
            uid: doc.uid,
          });
        } else {
          setSource({ uid });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSource({ uid });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [submission?.uid]);

  return source;
}
