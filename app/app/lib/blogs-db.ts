import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import type { Blog } from "./blog-types";

const COLLECTION = "blogs";

export async function getAllBlogsAdmin(): Promise<Blog[]> {
  const snap = await getDocs(collection(db, COLLECTION));
  const blogs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Blog[];
  return blogs.sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
}

export async function getPublishedBlogs(): Promise<Blog[]> {
  const q = query(
    collection(db, COLLECTION),
    where("status", "==", "published")
  );
  const snap = await getDocs(q);
  const blogs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Blog[];
  return blogs.sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
}

export async function getBlogById(id: string): Promise<Blog | null> {
  const ref = doc(db, COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as Blog;
}

export async function saveBlog(data: Partial<Blog> & { id?: string }): Promise<Blog> {
  const now = Timestamp.now();
  if (data.id) {
    const { id, ...rest } = data;
    const ref = doc(db, COLLECTION, id);
    await updateDoc(ref, {
      ...rest,
      updatedAt: now,
    } as any);
    const updated = await getDoc(ref);
    return { id, ...(updated.data() as any) } as Blog;
  }

  const ref = await addDoc(collection(db, COLLECTION), {
    title: data.title || "",
    description: data.description || "",
    blocks: data.blocks || [],
    featured: data.featured || false,
    status: data.status || "draft",
    createdAt: now,
    updatedAt: now,
  } as any);

  const snap = await getDoc(ref);
  return { id: ref.id, ...(snap.data() as any) } as Blog;
}

export async function deleteBlog(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function setFeaturedBlog(blogId: string): Promise<void> {
  const snap = await getDocs(collection(db, COLLECTION));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.update(d.ref, { featured: d.id === blogId });
  });
  await batch.commit();
}

export async function removeFeaturedBlog(): Promise<void> {
  const snap = await getDocs(collection(db, COLLECTION));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.update(d.ref, { featured: false });
  });
  await batch.commit();
}

export async function updateBlogPositions(blogIds: string[]): Promise<void> {
  const batch = writeBatch(db);
  blogIds.forEach((id, index) => {
    const ref = doc(db, COLLECTION, id);
    batch.update(ref, { position: index });
  });
  await batch.commit();
}
