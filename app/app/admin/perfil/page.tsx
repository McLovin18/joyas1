
"use client";
import React, { useEffect, useState, useRef } from "react";
import { getAuth, updateProfile } from "firebase/auth";
import { app, storage } from "../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function PerfilPage() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [editName, setEditName] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
        setDisplayName(user.displayName || "");
        setEmail(user.email || "");
        setPhotoURL(user.photoURL || "");
      }
    });
    return () => unsubscribe();
  }, []);

  const handleNameSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await updateProfile(user, { displayName });
      setEditName(false);
    } catch (e) {
      alert("Error al actualizar el nombre");
    }
    setLoading(false);
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    setLoading(true);
    try {
      // Sube la imagen a Storage en la carpeta del usuario
      const storageRef = ref(storage, `profile_pictures/${user.uid}/${file.name}`);
      await uploadBytes(storageRef, file);
      // Obtén la URL pública
      const url = await getDownloadURL(storageRef);
      setPhotoURL(url);
      await updateProfile(user, { photoURL: url });
    } catch (e) {
      alert("Error al subir la foto de perfil");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#3a1859] transition-colors px-4 py-6 sm:py-12">
      <h1 className="text-3xl font-bold mb-6 text-[#3a1859] dark:text-white">Mi perfil</h1>
      <div className="bg-white dark:bg-[#4b267a] rounded-xl shadow-lg p-8 flex flex-col items-center w-full max-w-md">
        {/* Foto de perfil */}
        <div className="relative mb-6">
          <div
            className="w-24 h-24 rounded-full bg-gray-200 dark:bg-[#2d1742] flex items-center justify-center overflow-hidden border-4 border-[#3a1859] dark:border-white cursor-pointer"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            title="Cambiar foto de perfil"
          >
            {photoURL ? (
              <img src={photoURL} alt="Foto de perfil" className="w-full h-full object-cover" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-[#3a1859] dark:text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 20.25a8.25 8.25 0 1115 0v.75a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75v-.75z" />
              </svg>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handlePhotoChange}
            />
          </div>
          <span className="block text-xs text-center text-[#3a1859] dark:text-white mt-2 cursor-pointer" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
            Cambiar foto
          </span>
        </div>

        {/* Datos personales */}
        <div className="w-full space-y-6">
          {/* Nombre editable */}
          <div>
            <label className="block text-sm font-semibold text-[#3a1859] dark:text-white mb-1">Nombre</label>
            {editName ? (
              <div className="flex gap-2">
                <input
                  className="border rounded px-2 py-1 flex-1 text-[#3a1859]"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  disabled={loading}
                />
                <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={handleNameSave} disabled={loading}>
                  Guardar
                </button>
                <button className="bg-gray-400 text-white px-3 py-1 rounded" onClick={() => setEditName(false)} disabled={loading}>
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <span className="text-[#3a1859] dark:text-white text-lg">{displayName || <span className="italic text-gray-400">Sin nombre</span>}</span>
                <button className="text-blue-600 dark:text-blue-300 underline text-sm" onClick={() => setEditName(true)}>
                  Editar
                </button>
              </div>
            )}
          </div>
          {/* Correo solo lectura */}
          <div>
            <label className="block text-sm font-semibold text-[#3a1859] dark:text-white mb-1">Correo electrónico</label>
            <input
              className="border rounded px-2 py-1 w-full text-[#3a1859] bg-gray-100 dark:bg-[#2d1742] cursor-not-allowed"
              value={email}
              disabled
              readOnly
            />
          </div>
        </div>
      </div>
    </div>
  );
}

