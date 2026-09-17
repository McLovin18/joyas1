import { sendPasswordResetEmail as _sendPasswordResetEmail } from "firebase/auth";
import { auth } from "./firebase";
import {
	signInWithEmailAndPassword,
	signOut,
	onAuthStateChanged,
	getIdToken,
	getIdTokenResult,
	User,
} from "firebase/auth";
import { loginWithRateLimit } from "./device-id-client";

// RECUPERAR CONTRASEÑA
export async function sendPasswordResetEmail(email: string) {
	await _sendPasswordResetEmail(auth, email);
}

// LOGIN
export async function loginUser(email: string, password: string) {
	try {
		// 🔒 Rate limit + validar credenciales en backend
		await loginWithRateLimit(email, password);
		
		// ✅ Luego: Login normal con Firebase SDK
		const userCredential = await signInWithEmailAndPassword(auth, email, password);
		const user = userCredential.user;

		const idToken = await getIdToken(user, true);
		const tokenResult = await getIdTokenResult(user);
		if (tokenResult.claims.admin !== true) {
			await signOut(auth);
			throw new Error("Solo el administrador puede iniciar sesión en esta tienda.");
		}

		return { success: true, user, idToken };
	} catch (error: any) {
		// Si es error del rate limit o validación, propagar
		if (
			error.message.includes("Demasiados")
			|| error.message.includes("Email")
			|| error.message.includes("administrador")
		) {
			throw error;
		}
		// Otros errores de Firebase
		throw new Error(error.message || "Error al iniciar sesión");
	}
}

// LOGOUT
export async function logoutUser() {
	await signOut(auth);
}

// OBTENER USUARIO ACTUAL Y SU ROL
export async function getCurrentUser(): Promise<null | (User & { role?: string })> {
	return new Promise((resolve) => {
		onAuthStateChanged(auth, async (user) => {
			if (!user) return resolve(null);
			const idToken = await getIdToken(user, true);
			// Llama a tu API para obtener el rol desde el token/cookie
			try {
				const res = await fetch("/api/auth/me", {
					headers: { Authorization: `Bearer ${idToken}` },
				});
				if (res.ok) {
					const data = await res.json();
					return resolve({ ...user, role: data.role });
				}
			} catch (e) {}
			// Si falla, solo devuelve el usuario
			resolve(user);
		});
	});
}

// REDIRECCIÓN AUTOMÁTICA SI YA ESTÁ LOGUEADO
export async function redirectIfLoggedIn(router: any) {
	onAuthStateChanged(auth, async (user) => {
		if (!user) return;
		// Obtener el rol real del usuario desde el backend
		const idToken = await getIdToken(user, true);
		try {
			const res = await fetch("/api/auth/me", {
				headers: { Authorization: `Bearer ${idToken}` },
			});
			if (res.ok) {
				const data = await res.json();
				if (data.role === "admin") router.push("/admin");
				else router.push("/login");
				return;
			}
		} catch (e) {}
		router.push("/login");
	});
}
