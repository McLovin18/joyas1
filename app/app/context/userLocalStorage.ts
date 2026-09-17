// Lógica global de favoritos y carrito para el contexto de usuario
// Se puede importar y usar en UserContext

// Clave del carrito: 'carrito_guest' para invitados, 'carrito_<uid>' para logueados
export function getCartKey(uid?: string | null) {
  return uid ? `carrito_${uid}` : "carrito_guest";
}

// Identificador estable por ítem del carrito.
// Para camisetas usa talla/color; para productos simples cae al id.
export function getCartItemKey(item: any) {
  if (!item) return "";
  return item.cartKey || item.variantKey || item.id;
}

export function getInitialFavorites() {
  if (typeof window !== "undefined") {
    const fav = localStorage.getItem("favoritos");
    return fav ? JSON.parse(fav) : [];
  }
  return [];
}

export function getInitialCart(uid?: string | null) {
  if (typeof window !== "undefined") {
    const cart = localStorage.getItem(getCartKey(uid));
    return cart ? JSON.parse(cart) : [];
  }
  return [];
}

export function saveFavorites(favs) {
  if (typeof window !== "undefined") {
    localStorage.setItem("favoritos", JSON.stringify(favs));
  }
}

export function saveCart(cart, uid?: string | null) {
  if (typeof window !== "undefined") {
    localStorage.setItem(getCartKey(uid), JSON.stringify(cart));
  }
}

/**
 * Fusiona el carrito de invitado con el carrito del usuario logueado.
 * Los productos del invitado tienen prioridad (actualizan cantidad si ya existen).
 * Limpia el carrito de invitado tras la fusión.
 * Retorna el carrito fusionado.
 */
export function mergeGuestCartIntoUser(uid: string): any[] {
  if (typeof window === "undefined") return [];
  const guestCart: any[] = JSON.parse(localStorage.getItem("carrito_guest") || "[]");
  const userCart: any[] = JSON.parse(localStorage.getItem(getCartKey(uid)) || "[]");

  if (guestCart.length === 0) return userCart;

  // Fusionar: partir del carrito del usuario y sobreescribir/agregar ítems del invitado
  const merged = [...userCart];
  for (const guestItem of guestCart) {
    const guestKey = getCartItemKey(guestItem);
    const idx = merged.findIndex(p => getCartItemKey(p) === guestKey);
    if (idx >= 0) {
      // Si ya existe, sumar cantidades (sin superar el stock)
      const combined = merged[idx].cantidad + guestItem.cantidad;
      merged[idx] = { ...merged[idx], cantidad: guestItem.stock ? Math.min(combined, guestItem.stock) : combined };
    } else {
      merged.push(guestItem);
    }
  }

  // Guardar fusionado y limpiar guest
  localStorage.setItem(getCartKey(uid), JSON.stringify(merged));
  localStorage.removeItem("carrito_guest");
  return merged;
}


