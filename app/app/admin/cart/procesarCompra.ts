import { crearOrden } from "../../lib/ordenes-db";



export async function procesarCompra(carrito, userId) {
  if (!userId) {
    throw new Error("No se pudo obtener el ID del usuario. Por favor, vuelve a iniciar sesión como admin.");
  }
  // 1. Crear la orden
  const orden = await crearOrden({
    userId: String(userId),
    productos: carrito,
    total: carrito.reduce((sum, p) => sum + (p.precio * (p.cantidad || 1)), 0),
    estado: "pagado"
  });

  // 2. Actualizar stock de cada producto
  for (const p of carrito) {
    // Asegura que stock y cantidad sean números
    const stockActual = typeof p.stock === 'string' ? parseInt(p.stock) : p.stock;
    const cantidadComprada = typeof p.cantidad === 'string' ? parseInt(p.cantidad) : p.cantidad || 1;
    try {
      const res = await fetch("/api/admin/update-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, stock: stockActual - cantidadComprada })
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("[procesarCompra] Error al actualizar stock:", data);
      } else {
        console.log(`[procesarCompra] Stock actualizado para producto ${p.id} a ${stockActual - cantidadComprada}`);
      }
    } catch (err) {
      console.error("[procesarCompra] Error de red al actualizar stock:", err);
    }
  }

  return orden;
}
