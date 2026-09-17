"use client";
import React, { useState } from "react";
import { useUser } from "../../context/UserContext";
import { procesarCompra } from "./procesarCompra";
import { getCartItemKey } from "../../context/userLocalStorage";

type CarritoProducto = {
	id: string;
	nombre: string;
	precio: number;
	stock: number;
	cantidad: number;
	imagenes?: string[];
};

type User = {
	uid: string;
	role?: string;
};


export default function CartPage() {
	const { carrito, removeCarrito, addCarrito, user, setUser } = useUser() as {
		carrito: CarritoProducto[];
		removeCarrito: (id: string) => void;
		addCarrito: (p: CarritoProducto) => void;
		user: User | null;
		setUser: (u: User) => void;
	};
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [loading, setLoading] = useState(false);

	// Calcular totales
	const subtotal = carrito.reduce((sum, p) => sum + (p.precio * (p.cantidad || 1)), 0);
	const envio = 0;
	const total = subtotal + envio;

	const handleCantidad = (id: string, cantidad: number) => {
		if (cantidad < 1) return;
		const prod = carrito.find(p => getCartItemKey(p) === id);
		if (prod) {
			const availableStock = Number(prod.stock || prod.variantStock || 0);
			if (cantidad > availableStock) {
				setError(`Solo hay ${availableStock} unidades disponibles en stock de "${prod.nombre}".`);
				return;
			}
			setError("");
			removeCarrito(id);
			addCarrito({ ...prod, cantidad });
		}
	};

	// Comprar productos
	const handleComprar = async () => {
		setError("");
		setSuccess("");
		setLoading(true);
		try {
			if (!user || !user.uid) {
				setError("Debes iniciar sesión para comprar.");
				setLoading(false);
				return;
			}
			await procesarCompra(carrito, user.uid);
			setSuccess("¡Compra realizada y stock actualizado!");
			// Limpiar carrito
			carrito.forEach(p => removeCarrito(getCartItemKey(p)));
		} catch (e) {
			setError("Error al procesar la compra. Intenta de nuevo.");
		}
		setLoading(false);
	};

	return (
		<div className="min-h-screen flex flex-col bg-white dark:bg-[#3a1859] transition-colors">
			<main className="max-w-6xl mx-auto px-4 py-6 lg:px-6 sm:py-12 flex-1">
				<h1 className="text-3xl font-bold mb-8 text-[#3a1859] dark:text-white">Carrito de compras (Admin)</h1>
				{error && (
					<div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg border border-red-300">
						{error}
					</div>
				)}
				{success && (
					<div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg border border-green-300">
						{success}
					</div>
				)}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Items */}
					<div className="lg:col-span-2">
						{carrito.length === 0 ? (
							<div className="text-center py-12">
								<span className="material-icons-round text-6xl opacity-30 text-[#3a1859] dark:text-white">shopping_bag</span>
								<h3 className="text-xl font-semibold mt-4 text-[#3a1859] dark:text-white">Carrito vacío</h3>
								<a href="/admin/products-by-category" className="inline-block mt-4 px-6 py-2 bg-accent text-white rounded-lg">Continuar comprando</a>
							</div>
						) : (
							<div className="space-y-4">
								{carrito.map((p) => {
									const itemKey = getCartItemKey(p);
									return (
									<div key={itemKey} className="flex items-center gap-4 bg-white dark:bg-slate-800 rounded-xl shadow p-4">
										<img src={p.imagenes?.[0] || "/no-image.png"} alt={p.nombre} className="w-20 h-20 object-contain rounded-lg border" />
										<div className="flex-1">
											<div className="font-bold text-lg">{p.nombre}</div>
											{p.selectedTalla && p.selectedColor && (
												<div className="text-xs text-slate-500 dark:text-slate-300 mt-1">
													Talla {p.selectedTalla} · Color {p.selectedColor}
												</div>
											)}
											{p.selectedVariations && p.variationAttributeIds && p.variationAttributeIds.length > 0 && (
												<div className="text-xs text-slate-500 dark:text-slate-300 mt-1">
													{p.variationAttributeIds.map((attrId: string) => {
														const value = p.selectedVariations[attrId];
														return value ? `${attrId}: ${value}` : null;
													}).filter(Boolean).join(" · ")}
												</div>
											)}
											<div className="text-slate-500 dark:text-slate-300">${p.precio}</div>
											<div className="flex items-center gap-2 mt-2">
												<label className="text-sm">Cantidad:</label>
												<input
													type="number"
													min={1}
													value={p.cantidad || 1}
														onChange={e => handleCantidad(itemKey, Number(e.target.value))}
													className="w-16 px-2 py-1 rounded border"
												/>
													<button className="ml-2 text-red-600 hover:text-red-800" onClick={() => removeCarrito(itemKey)}>
													<span className="material-icons-round">delete</span>
												</button>
											</div>
										</div>
										<div className="font-bold text-lg">${(p.precio * (p.cantidad || 1)).toFixed(2)}</div>
										</div>
									);
									})}
							</div>
						)}
					</div>
					{/* Resumen */}
					<div className="lg:col-span-1">
						<div className="rounded-xl p-6 sticky top-20 bg-white text-slate-900 dark:bg-[#3a1859] dark:text-white">
							<h2 className="text-lg font-bold mb-4">Resumen</h2>
							<div className="space-y-3 border-b border-slate-200 dark:border-[#6d28d9] pb-4 mb-4">
								<div className="flex justify-between text-sm">
									<span>Subtotal</span>
									<span>${subtotal.toFixed(2)}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span>Envío</span>
									<span className="text-green-600 dark:text-green-400">Gratis</span>
								</div>
							</div>
							<div className="flex justify-between text-lg font-bold mb-6">
								<span>Total</span>
								<span>${total.toFixed(2)}</span>
							</div>
							{carrito.length > 0 && (
								<button
									className="w-full block text-center px-4 py-3 bg-accent text-white font-bold rounded-lg hover:bg-accent/90 disabled:opacity-60"
									onClick={handleComprar}
									disabled={loading}
								>
									{loading ? "Procesando..." : "Comprar y actualizar stock"}
								</button>
							)}
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}

