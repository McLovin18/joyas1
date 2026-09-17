import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const INSTAGRAM_DOC = "instagram_config";

export interface InstagramConfig {
  accessToken?: string;
  userId?: string;
  followersCount?: number;
  lastUpdated?: string;
  expiresAt?: string;
}

export async function getInstagramConfig(): Promise<InstagramConfig> {
  try {
    const docRef = doc(db, "config", INSTAGRAM_DOC);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as InstagramConfig;
    }
    return {};
  } catch (error) {
    console.error("Error getting Instagram config:", error);
    return {};
  }
}

export async function saveInstagramConfig(config: InstagramConfig): Promise<void> {
  try {
    const docRef = doc(db, "config", INSTAGRAM_DOC);
    await setDoc(docRef, config, { merge: true });
  } catch (error) {
    console.error("Error saving Instagram config:", error);
    throw error;
  }
}

export async function updateFollowersCount(count: number): Promise<void> {
  try {
    const docRef = doc(db, "config", INSTAGRAM_DOC);
    await setDoc(docRef, {
      followersCount: count,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error("Error updating followers count:", error);
    throw error;
  }
}
