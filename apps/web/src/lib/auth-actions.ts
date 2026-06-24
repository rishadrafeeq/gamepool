"use client";

import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { apiFetch } from "@/lib/api-client";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { isFirebaseClientConfigured } from "@/lib/env.client";
import type { User } from "@/types";

export async function signUpWithEmail(email: string, password: string, displayName?: string) {
  if (!isFirebaseClientConfigured()) {
    throw new Error("Firebase is not configured");
  }
  const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  await sendEmailVerification(credential.user);
  await bootstrapUser({ displayName });
  return credential.user;
}

export async function signInWithEmail(email: string, password: string) {
  if (!isFirebaseClientConfigured()) {
    throw new Error("Firebase is not configured");
  }
  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  await bootstrapUser();
  return credential.user;
}

export async function bootstrapUser(body?: { displayName?: string; city?: string }) {
  const res = await apiFetch<User>("/api/v1/auth/bootstrap", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
  return res.data;
}

export async function signOutUser() {
  if (isFirebaseClientConfigured()) {
    await signOut(getFirebaseAuth());
  }
}

export function isProfileComplete(user: User | undefined): boolean {
  if (!user?.profile) return false;
  const hasName = Boolean(user.profile.displayName?.trim());
  const hasCity = Boolean(user.profile.city?.trim() && user.profile.city !== "Unknown");
  const hasSports = (user.userSports?.length ?? 0) > 0;
  return hasName && hasCity && hasSports;
}
