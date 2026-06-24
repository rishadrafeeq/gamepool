import {
  cert,
  getApps,
  initializeApp,
  type App as FirebaseAdminApp,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getStorage, type Storage } from "firebase-admin/storage";

import { isFirebaseAdminConfigured, getServerEnv } from "@/lib/env.server";

let adminApp: FirebaseAdminApp | undefined;
let adminAuth: Auth | undefined;
let adminStorage: Storage | undefined;

export function getFirebaseAdminApp(): FirebaseAdminApp {
  if (!isFirebaseAdminConfigured()) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.",
    );
  }

  if (!adminApp) {
    adminApp =
      getApps().length > 0
        ? getApps()[0]!
        : initializeApp({
            credential: cert({
              projectId: getServerEnv().FIREBASE_PROJECT_ID!,
              clientEmail: getServerEnv().FIREBASE_CLIENT_EMAIL!,
              privateKey: getServerEnv().FIREBASE_PRIVATE_KEY!,
            }),
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          });
  }

  return adminApp;
}

export function getFirebaseAdminAuth(): Auth {
  if (!adminAuth) {
    adminAuth = getAuth(getFirebaseAdminApp());
  }
  return adminAuth;
}

export function getFirebaseAdminStorage(): Storage {
  if (!adminStorage) {
    adminStorage = getStorage(getFirebaseAdminApp());
  }
  return adminStorage;
}

export async function verifyFirebaseIdToken(idToken: string) {
  return getFirebaseAdminAuth().verifyIdToken(idToken);
}
