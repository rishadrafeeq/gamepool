"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useQueryClient } from "@tanstack/react-query";

import { isFirebaseClientConfigured } from "@/lib/env.client";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { useAuthStore } from "@/stores/auth-store";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api-client";
import type { User } from "@/types";

export function useAuthListener() {
  const { setFirebaseUid, setUser, setInitialized } = useAuthStore();
  const qc = useQueryClient();

  useEffect(() => {
    if (!isFirebaseClientConfigured()) {
      setInitialized(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (user) => {
      setFirebaseUid(user?.uid ?? null);
      if (user) {
        try {
          const res = await apiFetch<User>("/api/v1/users/me");
          setUser(res.data);
          qc.setQueryData(queryKeys.me, res.data);
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
        qc.removeQueries({ queryKey: queryKeys.me });
      }
      setInitialized(true);
    });

    return () => unsubscribe();
  }, [setFirebaseUid, setInitialized, setUser, qc]);
}
