import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "./firebase";

/**
 * Sube una imagen a Firebase Storage y retorna la URL pública.
 * @param file Archivo de imagen a subir
 * @param path Ruta en Storage (ej: 'productos/nombre.jpg')
 * @returns URL pública de la imagen
 */
export async function uploadImageAndGetUrl(file: File, path: string): Promise<string> {
  const storage = getStorage(app);
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return url;
}
