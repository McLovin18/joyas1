"use client";

import React, { useEffect, useState } from "react";
import { obtenerTodasOrdenes } from "../lib/ordenes-db";
import { obtenerProductos, Producto } from "../lib/productos-db";
import { useRouter } from "next/navigation";
import { Loading3DIcon } from "../components/Loading3DIcon";
import AnalyticsWidget from "../components/AnalyticsWidget";
import { useTrackPageView } from "../lib/useAnalytics";

type Orden = {
	id: string;
	estado?: string;
	total?: number;
	productos?: { cantidad?: number; nombre?: string }[];
	orderId?: string;
	userName?: string;
	userId?: string;
	userEmail?: string;
	guestEmail?: string;
	visitaFecha?: string;
	visitaHora?: string;
	metodoPago?: string;
};

function getTodayYMD() {
	return new Date().toISOString().slice(0, 10);
}

function formatDate(ymd: string) {
	const [y, m, d] = ymd.split("-");
	return `${d}/${m}/${y}`;
}

export default function AdminPage() {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [stats, setStats] = useState<{
		totalVentas: number;
		productosVendidos: number;
		productosSinStock: Producto[];
		ordenesHoy: Orden[];
	}>({
		totalVentas: 0,
		productosVendidos: 0,
		productosSinStock: [],
		ordenesHoy: [],
	});
	const router = useRouter();
	const today = getTodayYMD();

	// Track page view on admin page load
	useTrackPageView();

	useEffect(() => {
		async function fetchStats() {
			setLoading(true);
			setError("");
			try {
				const [ordenesRaw, productosRaw] = await Promise.all([
					obtenerTodasOrdenes(),
					obtenerProductos({ incluirSinStock: true }),
				]);

				const ordenes = ordenesRaw as Orden[];
				const productos = productosRaw as Producto[];

				let totalVentas = 0;
				let productosVendidos = 0;
				for (const orden of ordenes) {
					if (orden.estado === "pagada" || orden.estado === "entregada") {
						totalVentas += Number(orden.total || 0);
						if (Array.isArray(orden.productos)) {
							productosVendidos += orden.productos.reduce(
								(acc, p) => acc + (Number(p.cantidad) || 0),
								0
							);
						}
					}
				}

				const productosSinStock = productos.filter((p) => Number(p.stock) === 0);

				// Órdenes con visita hoy (cualquier estado activo)
				const ordenesHoy = ordenes.filter(
					(o) =>
						o.visitaFecha === today &&
						o.estado !== "rechazada" &&
						o.estado !== "cancelada"
				);

				setStats({ totalVentas, productosVendidos, productosSinStock, ordenesHoy });
			} catch (e) {
				setError("Error al cargar estadísticas. Intenta de nuevo.");
			} finally {
				setLoading(false);
			}
		}
		fetchStats();
	}, []);

	const getNombreCliente = (o: Orden) =>
		o.userName || o.userEmail || o.guestEmail || o.userId || "Sin datos";

	const estadoConfig: Record<string, { label: string; bg: string; text: string }> = {
		generada:       { label: "Generada",       bg: "#E6F1FB", text: "#0C447C" },
		aprobada:       { label: "Aprobada",        bg: "#EAF3DE", text: "#27500A" },
		pendiente_pago: { label: "Pago pendiente",  bg: "#FAEEDA", text: "#633806" },
		pago_fallido:   { label: "Pago fallido",    bg: "#FCEBEB", text: "#791F1F" },
	};

	return (
		<div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
			<div className="max-w-3xl mx-auto px-4 py-10">

				{/* Header */}
				<div className="mb-8">
					<p className="text-sm text-slate-400 dark:text-slate-500 mb-1">
						{new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
					</p>
					<h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Panel de administración</h1>
				</div>

				{loading ? (
					<div className="flex flex-col items-center justify-center py-20">
						<Loading3DIcon />
					</div>
				) : error ? (
					<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-300 text-sm font-medium">
						{error}
					</div>
				) : (
					<div className="flex flex-col gap-8">

						{/* Analytics Widget - First Section */}
						<AnalyticsWidget />

						{/* Stats Cards Grid */}
						<div className="grid grid-cols-3 gap-4">
							{/* Total Ventas */}
							<div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 cursor-pointer hover:border-purple-400 dark:hover:border-purple-600 transition-colors">
								<p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Ventas totales hoy</p>
								<p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
									${stats.totalVentas.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
								</p>
							</div>

							{/* Productos Vendidos */}
							<div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 cursor-pointer hover:border-green-400 dark:hover:border-green-600 transition-colors">
								<p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Productos vendidos</p>
								<p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
									{stats.productosVendidos}
								</p>
							</div>

							{/* Sin Stock */}
							<div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 cursor-pointer hover:border-amber-400 dark:hover:border-amber-600 transition-colors" onClick={() => router.push("/admin/productos")}>
								<p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Sin stock</p>
								<p className={`text-2xl font-bold ${stats.productosSinStock.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-800 dark:text-slate-100"}`}>
									{stats.productosSinStock.length}
								</p>
							</div>
						</div>

						{/* Sin stock warning */}
						{stats.productosSinStock.length > 0 && (
							<div
								className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
								onClick={() => router.push("/admin/inventario")}
							>
								<p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2 uppercase tracking-wide">
									Productos sin stock
								</p>
								<div className="flex flex-wrap gap-1.5">
									{stats.productosSinStock.slice(0, 8).map((p) => (
										<span
											key={p.id}
											className="text-xs px-2 py-0.5 rounded-md bg-amber-200/70 dark:bg-amber-800/60 text-amber-800 dark:text-amber-200"
										>
											{p.nombre || p.id}
										</span>
									))}
									{stats.productosSinStock.length > 8 && (
										<span className="text-xs text-amber-600 dark:text-amber-400 self-center">
											+{stats.productosSinStock.length - 8} más
										</span>
									)}
								</div>
							</div>
						)}

						{/* Órdenes de hoy */}
						<div>
							<div className="flex items-center justify-between mb-3">
								<div>
									<h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
										Entregas de hoy
									</h2>
									<p className="text-xs text-slate-400 dark:text-slate-500">
										{formatDate(today)} — visitas programadas
									</p>
								</div>
								<div className="flex items-center gap-2">
									<span className={`text-sm font-bold px-3 py-1 rounded-full ${
										stats.ordenesHoy.length > 0
											? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
											: "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
									}`}>
										{stats.ordenesHoy.length} {stats.ordenesHoy.length === 1 ? "orden" : "órdenes"}
									</span>
									<button
										onClick={() => router.push("/admin/pedidos")}
										className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
									>
										Ver todas →
									</button>
								</div>
							</div>

							{stats.ordenesHoy.length === 0 ? (
								<div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
									<p className="text-2xl mb-2">📭</p>
									<p className="text-sm text-slate-400 dark:text-slate-500">No hay entregas programadas para hoy.</p>
								</div>
							) : (
								<div className="space-y-3">
									{stats.ordenesHoy.map((orden) => {
										const estadoInfo = estadoConfig[orden.estado || ""] || {
											label: orden.estado || "—",
											bg: "#F1EFE8",
											text: "#5F5E5A",
										};
										const totalProductos = (orden.productos || []).reduce(
											(acc, p) => acc + (Number(p.cantidad) || 0),
											0
										);
										return (
											<div
												key={orden.id}
												className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 cursor-pointer hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-sm transition-all"
												onClick={() => router.push(`/admin/pedidos`)}
											>
												<div className="flex items-start justify-between gap-3">
													<div className="flex-1 min-w-0">
														<div className="flex items-center gap-2 mb-1 flex-wrap">
															<span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
																{orden.orderId || `#${orden.id.slice(-6)}`}
															</span>
															{/* payment method badge removed (Stripe not used) */}
														</div>
														<p className="text-sm text-slate-600 dark:text-slate-300 truncate">
															{getNombreCliente(orden)}
														</p>
														<p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
															{totalProductos} {totalProductos === 1 ? "producto" : "productos"}
															{orden.visitaHora && <> · {orden.visitaHora}</>}
														</p>
													</div>
													<div className="flex flex-col items-end gap-1.5 shrink-0">
														<span
															className="text-xs font-semibold px-2 py-0.5 rounded-full"
															style={{ background: estadoInfo.bg, color: estadoInfo.text }}
														>
															{estadoInfo.label}
														</span>
														{typeof orden.total === "number" && (
															<span className="text-sm font-bold text-slate-800 dark:text-slate-100">
																${orden.total.toFixed(2)}
															</span>
														)}
													</div>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>

						{/* Accesos rápidos */}
						<div>
							<h2 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">
								Accesos rápidos
							</h2>
							<div className="grid grid-cols-2 gap-3">
								{[
									{ label: "Pedidos", desc: "Gestionar todas las órdenes", href: "/admin/pedidos", icon: "📋" },
									{ label: "Productos", desc: "Inventario y stock", href: "/admin/productos", icon: "📦" },
									{ label: "Clientes", desc: "Ver usuarios registrados", href: "/admin/clientes", icon: "👥" },
									{ label: "Configuración", desc: "Ajustes del sistema", href: "/admin/configuracion", icon: "⚙️" },
								].map((item) => (
									<button
										key={item.href}
										onClick={() => router.push(item.href)}
										className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-left hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-sm transition-all"
									>
										<span className="text-xl mb-2 block" style={{ fontSize: 20 }}>{item.icon}</span>
										<p className="font-semibold text-sm text-slate-800 dark:text-slate-100">{item.label}</p>
										<p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{item.desc}</p>
									</button>
								))}
							</div>
						</div>

					</div>
				)}
			</div>
		</div>
	);
}
