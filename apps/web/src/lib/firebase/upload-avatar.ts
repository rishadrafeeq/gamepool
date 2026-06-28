import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { getFirebaseAuth, getFirebaseStorage } from "@/lib/firebase/client";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function uploadProfileAvatar(file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Please choose a JPG, PNG, WebP, or GIF image");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image must be 5 MB or smaller");
  }

  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error("You must be signed in to upload a photo");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `avatars/${user.uid}/${Date.now()}.${ext}`;
  const storageRef = ref(getFirebaseStorage(), path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}
