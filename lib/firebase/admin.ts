import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function initAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  if (process.env.FIREBASE_PRIVATE_KEY) {
    return initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }

  // Application Default Credentials (Cloud Run usa esto automáticamente)
  return initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const adminApp = initAdminApp();
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);

export async function getServerUser() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;
  if (!session) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(session, true);
    return { uid: decoded.uid, email: decoded.email as string | undefined };
  } catch {
    return null;
  }
}

export function fromDoc<T extends { id: string }>(
  doc: FirebaseFirestore.DocumentSnapshot
): T | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  const converted: Record<string, unknown> = { id: doc.id };
  for (const [k, v] of Object.entries(data)) {
    converted[k] = v instanceof Timestamp ? v.toDate().toISOString() : v;
  }
  return converted as T;
}

export function fromDocs<T extends { id: string }>(
  snapshot: FirebaseFirestore.QuerySnapshot
): T[] {
  return snapshot.docs
    .map((d) => fromDoc<T>(d))
    .filter((d): d is T => d !== null);
}
