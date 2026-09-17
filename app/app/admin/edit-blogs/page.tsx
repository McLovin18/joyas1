"use client";

import { useEffect, useState, ChangeEvent } from "react";
import type {
	Blog,
	BlogBlock,
	BlogBlockType,
	BlogFieldStyle,
} from "../../lib/blog-types";
import {
	getAllBlogsAdmin,
	saveBlog,
	deleteBlog,
	setFeaturedBlog,
	removeFeaturedBlog,
	updateBlogPositions,
} from "../../lib/blogs-db";
import { uploadImageAndGetUrl } from "../../lib/upload-image";
import BlogPreview from "../../blogs/BlogPreview";

type EditableBlog = Partial<Blog> & { id?: string };

function createEmptyBlog(): EditableBlog {
	return {
		title: "",
		description: "",
		blocks: [],
		status: "draft",
		featured: false,
	};
}

function createBlockId() {
	return `block-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toPreviewBlog(blog: EditableBlog): Blog {
	return {
		id: blog.id || "preview",
		title: blog.title || "",
		description: blog.description || "",
		blocks: (blog.blocks as BlogBlock[]) || [],
		featured: blog.featured || false,
		status: (blog.status as any) || "draft",
	};
}

export default function AdminEditBlogsPage() {
	const [blogs, setBlogs] = useState<Blog[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [editingBlog, setEditingBlog] = useState<EditableBlog | null>(null);
	const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">(
		"desktop"
	);
	const [showPreviewModal, setShowPreviewModal] = useState(false);
	const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
	const [draggedBlockIndex, setDraggedBlockIndex] = useState<number | null>(null);
	const [draggedBlogIndex, setDraggedBlogIndex] = useState<number | null>(null);

	useEffect(() => {
		async function load() {
			setLoading(true);
			const all = await getAllBlogsAdmin();
			setBlogs(all);
			if (all.length > 0) {
				setSelectedId(all[0].id);
				setEditingBlog(all[0]);
			} else {
				setSelectedId(null);
				setEditingBlog(createEmptyBlog());
			}
			setLoading(false);
		}
		load();
	}, []);

	const handleSelectBlog = (blog: Blog) => {
		setSelectedId(blog.id);
		setEditingBlog(blog);
	};

	const handleNewBlog = () => {
		setSelectedId(null);
		setEditingBlog(createEmptyBlog());
	};

	const updateEditingField = (
		field: keyof EditableBlog,
		value: string | boolean | "draft" | "published"
	) => {
		setEditingBlog((prev) => (prev ? { ...prev, [field]: value } : prev));
	};

	const updateBlock = (index: number, updater: (block: BlogBlock) => BlogBlock) => {
		setEditingBlog((prev) => {
			if (!prev) return prev;
			const blocks = (prev.blocks as BlogBlock[]) || [];
			if (!blocks[index]) return prev;
			const updated = [...blocks];
			updated[index] = updater(updated[index]);
			return { ...prev, blocks: updated };
		});
	};

	const addBlock = (type: BlogBlockType) => {
		const id = createBlockId();
		let block: BlogBlock;
		if (type === "subtitle") {
			block = { id, type: "subtitle", text: "Nuevo subtítulo" };
		} else if (type === "paragraph") {
			block = {
				id,
				type: "paragraph",
				text: "Nuevo párrafo. Escribe aquí el contenido del artículo.",
			};
		} else {
			block = {
				id,
				type: "image",
				url: "",
				alt: "",
				caption: "",
			};
		}

		setEditingBlog((prev) => {
			const current = prev || createEmptyBlog();
			const blocks = (current.blocks as BlogBlock[]) || [];
			return { ...current, blocks: [...blocks, block] };
		});
	};

	const removeBlock = (index: number) => {
		setEditingBlog((prev) => {
			if (!prev) return prev;
			const blocks = (prev.blocks as BlogBlock[]) || [];
			const updated = blocks.filter((_, i) => i !== index);
			return { ...prev, blocks: updated };
		});
	};

	const moveBlock = (index: number, direction: -1 | 1) => {
		setEditingBlog((prev) => {
			if (!prev) return prev;
			const blocks = (prev.blocks as BlogBlock[]) || [];
			const newIndex = index + direction;
			if (newIndex < 0 || newIndex >= blocks.length) return prev;
			const updated = [...blocks];
			const temp = updated[index];
			updated[index] = updated[newIndex];
			updated[newIndex] = temp;
			return { ...prev, blocks: updated };
		});
	};

	const handleBlockDragStart = (e: React.DragEvent, index: number) => {
		e.dataTransfer.effectAllowed = "move";
		e.dataTransfer.setData("text/plain", String(index));
		setDraggedBlockIndex(index);
	};

	const handleBlockDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
	};

	const handleBlockDrop = (e: React.DragEvent, targetIndex: number) => {
		e.preventDefault();
		e.stopPropagation();
		if (draggedBlockIndex === null || draggedBlockIndex === targetIndex) {
			setDraggedBlockIndex(null);
			return;
		}

		setEditingBlog((prev) => {
			if (!prev) return prev;
			const blocks = (prev.blocks as BlogBlock[]) || [];
			const updated = [...blocks];
			const draggedBlock = updated[draggedBlockIndex];
			
			// Remover bloque arrastrado
			updated.splice(draggedBlockIndex, 1);
			
			// Ajustar índice destino después de remover
			const adjustedTargetIndex = draggedBlockIndex < targetIndex ? targetIndex - 1 : targetIndex;
			
			// Insertar en nueva posición
			updated.splice(adjustedTargetIndex, 0, draggedBlock);
			
			return { ...prev, blocks: updated };
		});
		
		setDraggedBlockIndex(null);
	};

	const handleBlogDragStart = (e: React.DragEvent, index: number) => {
		e.dataTransfer.effectAllowed = "move";
		e.dataTransfer.setData("text/plain", String(index));
		setDraggedBlogIndex(index);
	};

	const handleBlogDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
	};

	const handleBlogDrop = async (e: React.DragEvent, targetIndex: number) => {
		e.preventDefault();
		e.stopPropagation();
		if (draggedBlogIndex === null || draggedBlogIndex === targetIndex) {
			setDraggedBlogIndex(null);
			return;
		}

		const updated = [...blogs];
		const draggedBlog = updated[draggedBlogIndex];
		
		// Remover blog arrastrado
		updated.splice(draggedBlogIndex, 1);
		
		// Ajustar índice destino después de remover
		const adjustedTargetIndex = draggedBlogIndex < targetIndex ? targetIndex - 1 : targetIndex;
		
		// Insertar en nueva posición
		updated.splice(adjustedTargetIndex, 0, draggedBlog);
		
		// Guardar nuevo orden en la BD
		await updateBlogPositions(updated.map(b => b.id));
		
		// Actualizar estado local
		setBlogs(updated);
		setDraggedBlogIndex(null);
	};

	const updateBlockStyle = (
		index: number,
		key: keyof BlogFieldStyle,
		value: string
	) => {
		updateBlock(index, (block) => ({
			...block,
			style: {
				...(block.style || {}),
				[key]: value || undefined,
			},
		}));
	};

	const handleImageFileChange = async (
		index: number,
		e: ChangeEvent<HTMLInputElement>
	) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const blockId = (editingBlog?.blocks as BlogBlock[] | undefined)?.[index]?.id;
		if (!blockId) return;
		try {
			setUploadingBlockId(blockId);
			const path = `blogs/${Date.now()}-${file.name}`;
			const url = await uploadImageAndGetUrl(file, path);
			updateBlock(index, (block) => ({ ...block, url } as BlogBlock));
		} finally {
			setUploadingBlockId(null);
		}
	};

	const handleDeleteBlog = async (id: string) => {
		if (!confirm("¿Eliminar este blog? Esta acción no se puede deshacer.")) {
			return;
		}
		setSaving(true);
		await deleteBlog(id);
		const remaining = blogs.filter((b) => b.id !== id);
		setBlogs(remaining);
		if (selectedId === id) {
			if (remaining.length > 0) {
				setSelectedId(remaining[0].id);
				setEditingBlog(remaining[0]);
			} else {
				setSelectedId(null);
				setEditingBlog(createEmptyBlog());
			}
		}
		setSaving(false);
	};

	const handleSave = async (statusOverride?: "draft" | "published") => {
		if (!editingBlog) return;
		setSaving(true);
		const payload: EditableBlog = {
			id: editingBlog.id,
			title: editingBlog.title || "",
			description: editingBlog.description || "",
			blocks: (editingBlog.blocks as BlogBlock[]) || [],
			status: statusOverride || (editingBlog.status as any) || "draft",
			featured: editingBlog.featured || false,
		};

		const saved = await saveBlog(payload as any);

		setBlogs((prev) => {
			const exists = prev.some((b) => b.id === saved.id);
			if (exists) {
				return prev.map((b) => (b.id === saved.id ? saved : b));
			}
			return [saved, ...prev];
		});

		setSelectedId(saved.id);
		setEditingBlog(saved);
		setSaving(false);
	};

	const handleMakeFeatured = async () => {
		if (!editingBlog?.id) {
			alert("Primero guarda o publica el blog antes de destacarlo.");
			return;
		}
		setSaving(true);
		
		try {
			if (editingBlog.featured) {
				// Quitar destacado
				await removeFeaturedBlog();
				setBlogs((prev) =>
					prev.map((b) => ({ ...b, featured: false }))
				);
				setEditingBlog((prev) => (prev ? { ...prev, featured: false } : prev));
			} else {
				// Marcar como destacado
				await setFeaturedBlog(editingBlog.id);
				setBlogs((prev) =>
					prev.map((b) => ({ ...b, featured: b.id === editingBlog.id }))
				);
				setEditingBlog((prev) => (prev ? { ...prev, featured: true } : prev));
			}
		} catch (error) {
			console.error("Error al cambiar destacado:", error);
			alert("Error al cambiar el estado destacado del blog.");
		} finally {
			setSaving(false);
		}
	};

	const previewBlog = editingBlog ? toPreviewBlog(editingBlog) : null;

	return (
		<div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-950">
			<div className="flex-1 w-full py-6 sm:py-12 px-4 pt-4 pb-24">
				<div className="flex flex-col gap-2 mb-4">
					<h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
						Editor de blogs
					</h1>
					<p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
						Crea y edita artículos del blog usando bloques de subtítulos, párrafos e
						imágenes, con previsualización en vivo para desktop y móvil.
					</p>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-6 mt-4">
					{/* Editor y lista de blogs */}
					<section className="space-y-4">
						{/* Lista de blogs */}
						<div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
							<div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
								<div className="flex items-center gap-2">
									<span className="material-icons-round text-slate-500">article</span>
									<h2 className="font-semibold text-sm">Blogs existentes</h2>
								</div>
								<button
									onClick={handleNewBlog}
									className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full bg-purple-600 text-white hover:bg-purple-700"
								>
									<span className="material-icons-round text-base">add</span>
									Nuevo blog
								</button>
							</div>

							<div className="max-h-64 overflow-auto divide-y divide-slate-100 dark:divide-slate-800">
								{loading ? (
									<div className="px-4 py-4 text-sm text-slate-500">
										Cargando blogs...
									</div>
								) : blogs.length === 0 ? (
									<div className="px-4 py-4 text-sm text-slate-500">
										No hay blogs aún. Crea el primero.
									</div>
								) : (
									blogs.map((b, blogIndex) => (
										<div
											key={b.id}
											draggable
											onDragStart={(e) => handleBlogDragStart(e, blogIndex)}
											onDragOver={handleBlogDragOver}
											onDrop={(e) => handleBlogDrop(e, blogIndex)}
											onDragEnd={() => setDraggedBlogIndex(null)}
											className={`flex items-center justify-between px-4 py-3 text-sm cursor-pointer transition-all ${
												selectedId === b.id
													? "bg-purple-50 dark:bg-purple-900/30"
													: "hover:bg-slate-50 dark:hover:bg-slate-800/60"
											} ${
												draggedBlogIndex === blogIndex
													? "opacity-50 scale-95 ring-2 ring-purple-500"
													: ""
											}`}
											onClick={() => handleSelectBlog(b)}
										>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2">
													<span className="truncate font-medium">
														{b.title || "(Sin título)"}
													</span>
													{b.featured && (
														<span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 px-2 py-0.5 text-[11px] font-semibold">
															<span className="material-icons-round text-xs">
																star
															</span>
															Destacado
														</span>
													)}
												</div>
												<div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
													<span
														className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[11px] ${
															b.status === "published"
																? "border-emerald-500 text-emerald-600 dark:text-emerald-300"
																: "border-slate-400 text-slate-600 dark:text-slate-300"
														}`}
													>
														{b.status === "published" ? "Publicado" : "Borrador"}
													</span>
												</div>
											</div>
											<button
												onClick={(e) => {
													e.stopPropagation();
													handleDeleteBlog(b.id);
												}}
												className="ml-3 text-xs text-red-500 hover:text-red-600"
											>
												Eliminar
											</button>
										</div>
									))
								)}
							</div>
						</div>

						{/* Formulario de edición */}
						<div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 md:p-5 space-y-4">
							{!editingBlog ? (
								<p className="text-sm text-slate-500 dark:text-slate-400">
									Selecciona un blog de la lista o crea uno nuevo.
								</p>
							) : (
								<>
									<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
										<div className="flex-1 min-w-0">
											<label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
												Título del blog
											</label>
											<input
												type="text"
												value={editingBlog.title || ""}
												onChange={(e) => updateEditingField("title", e.target.value)}
												className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
												placeholder="Ej. Novedades en tecnología para este mes"
											/>
										</div>
										<div className="flex flex-col items-start gap-2 mt-3 md:mt-0 md:ml-4">
											{editingBlog.id && editingBlog.featured && (
												<span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 px-2 py-0.5 text-[11px] font-semibold">
													<span className="material-icons-round text-xs">star</span>
													Este es el blog destacado
												</span>
											)}
											<button
												type="button"
												onClick={handleMakeFeatured}
												disabled={!editingBlog.id || saving}
												className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${
													editingBlog.featured
														? "border-red-500 text-red-700 dark:text-red-300"
														: "border-amber-500 text-amber-700 dark:text-amber-300"
												}`}
											>
												<span className="material-icons-round text-sm">{editingBlog.featured ? "star_off" : "star"}</span>
												{editingBlog.featured ? "Quitar destacado" : "Marcar como destacado"}
											</button>
										</div>
									</div>

									<div>
										<label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
											Descripción corta (se muestra en la lista de artículos)
										</label>
										<textarea
											value={editingBlog.description || ""}
											onChange={(e) => updateEditingField("description", e.target.value)}
											className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm min-h-[60px]"
											placeholder="Resumen breve del contenido del blog."
										/>
									</div>

									<div className="flex flex-wrap gap-2 text-xs">
										<button
											type="button"
											onClick={() => addBlock("subtitle")}
											className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700"
										>
											<span className="material-icons-round text-sm">title</span>
											Subtítulo
										</button>
										<button
											type="button"
											onClick={() => addBlock("paragraph")}
											className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700"
										>
											<span className="material-icons-round text-sm">notes</span>
											Párrafo
										</button>
										<button
											type="button"
											onClick={() => addBlock("image")}
											className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700"
										>
											<span className="material-icons-round text-sm">image</span>
											Imagen
										</button>
									</div>

									<div className="space-y-3 max-h-[420px] overflow-auto pr-1">
										{Array.isArray(editingBlog.blocks) &&
										(editingBlog.blocks as BlogBlock[]).length > 0 ? (
											(editingBlog.blocks as BlogBlock[]).map((block, index) => (
												<div
													key={block.id || index}
													className={`border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50/60 dark:bg-slate-900/60 transition-all ${
														draggedBlockIndex === index
															? "opacity-50 scale-95 ring-2 ring-purple-500"
															: "hover:border-purple-300 dark:hover:border-purple-700"
													}`}
												>
													<div className="flex items-center justify-between mb-2">
														<div 
															draggable
															onDragStart={(e) => handleBlockDragStart(e, index)}
															onDragOver={handleBlockDragOver}
															onDrop={(e) => handleBlockDrop(e, index)}
															onDragEnd={() => setDraggedBlockIndex(null)}
															className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-move"
														>
															<span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-[11px]">
																{index + 1}
															</span>
															<span>
																{block.type === "subtitle"
																	? "Subtítulo"
																	: block.type === "paragraph"
																	? "Párrafo"
																	: "Imagen"}
															</span>
														</div>
														<div className="flex items-center gap-1 text-slate-500">
															<button
																type="button"
																className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
																onClick={() => moveBlock(index, -1)}
															>
																<span className="material-icons-round text-sm">
																	arrow_upward
																</span>
															</button>
															<button
																type="button"
																className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
																onClick={() => moveBlock(index, 1)}
															>
																<span className="material-icons-round text-sm">
																	arrow_downward
																</span>
															</button>
															<button
																type="button"
																className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500"
																onClick={() => removeBlock(index)}
															>
																<span className="material-icons-round text-sm">
																	delete
																</span>
															</button>
														</div>
													</div>

													{block.type === "subtitle" && (
														<div className="space-y-2">
															<input
																type="text"
																className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
																value={block.text}
																onChange={(e) =>
																	updateBlock(index, (b) => ({
																		...(b as any),
																		text: e.target.value,
																	}))
																}
																placeholder="Texto del subtítulo"
															/>
															<div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
																<div>
																	<label className="block mb-1">Color texto</label>
																	<input
																		type="color"
																		className="w-full h-8 rounded cursor-pointer bg-transparent"
																		value={block.style?.color || "#000000"}
																		onChange={(e) =>
																			updateBlockStyle(index, "color", e.target.value)
																		}
																	/>
																</div>
																<div>
																	<label className="block mb-1">Tamaño</label>
																	<input
																		type="text"
																		className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
																		placeholder="p.ej. 18px"
																		value={block.style?.fontSize || ""}
																		onChange={(e) =>
																			updateBlockStyle(index, "fontSize", e.target.value)
																		}
																	/>
																</div>
																<div>
																	<label className="block mb-1">Peso</label>
																	<select
																		className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
																		value={block.style?.fontWeight || "bold"}
																		onChange={(e) =>
																			updateBlockStyle(
																				index,
																				"fontWeight",
																				e.target.value as any
																			)
																		}
																	>
																		<option value="normal">Normal</option>
																		<option value="bold">Negrita</option>
																	</select>
																</div>
																<div>
																	<label className="block mb-1">Decoración</label>
																	<select
																		className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
																		value={block.style?.textDecoration || "none"}
																		onChange={(e) =>
																			updateBlockStyle(
																				index,
																				"textDecoration",
																				e.target.value as any
																			)
																		}
																	>
																		<option value="none">Ninguna</option>
																		<option value="underline">Subrayado</option>
																	</select>
																</div>
															</div>
														</div>
													)}

													{block.type === "paragraph" && (
														<div className="space-y-2">
															<textarea
																className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm min-h-[90px]"
																value={block.text}
																onChange={(e) =>
																	updateBlock(index, (b) => ({
																		...(b as any),
																		text: e.target.value,
																	}))
																}
																placeholder="Contenido del párrafo"
															/>
															<div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
																<div>
																	<label className="block mb-1">Color texto</label>
																	<input
																		type="color"
																		className="w-full h-8 rounded cursor-pointer bg-transparent"
																		value={block.style?.color || "#000000"}
																		onChange={(e) =>
																			updateBlockStyle(index, "color", e.target.value)
																		}
																	/>
																</div>
																<div>
																	<label className="block mb-1">Tamaño</label>
																	<input
																		type="text"
																		className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
																		placeholder="p.ej. 14px"
																		value={block.style?.fontSize || ""}
																		onChange={(e) =>
																			updateBlockStyle(index, "fontSize", e.target.value)
																		}
																	/>
																</div>
																<div>
																	<label className="block mb-1">Interlineado (padding vertical)</label>
																	<input
																		type="text"
																		className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
																		placeholder="p.ej. 4px"
																		value={block.style?.paddingBlock || ""}
																		onChange={(e) =>
																			updateBlockStyle(index, "paddingBlock", e.target.value)
																		}
																	/>
																</div>
																<div>
																	<label className="block mb-1">Fondo</label>
																	<input
																		type="text"
																		className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
																		placeholder="p.ej. #f3f4f6"
																		value={block.style?.backgroundColor || ""}
																		onChange={(e) =>
																			updateBlockStyle(
																				index,
																				"backgroundColor",
																				e.target.value
																			)
																		}
																	/>
																</div>
															</div>
														</div>
													)}

													{block.type === "image" && (
														<div className="space-y-2">
															<div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-3 items-start">
																<div className="space-y-2">
																	<label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
																		URL de la imagen
																	</label>
																	<input
																		type="text"
																		className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
																		value={block.url}
																		onChange={(e) =>
																			updateBlock(index, (b) => ({
																				...(b as any),
																				url: e.target.value,
																			}))
																		}
																		placeholder="https://..."
																	/>
																	<div className="flex flex-wrap items-center gap-2 text-[11px]">
																		<label className="inline-flex items-center gap-2 cursor-pointer">
																			<span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100">
																				Subir imagen
																			</span>
																			<input
																				type="file"
																				accept="image/*"
																				className="hidden"
																				onChange={(e) => handleImageFileChange(index, e)}
																			/>
																		</label>
																		{uploadingBlockId === block.id && (
																			<span className="text-slate-500">
																				Subiendo imagen...
																			</span>
																		)}
																	</div>
																	<div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300 mt-2">
																		<div>
																			<label className="block mb-1">Radio de borde</label>
																			<input
																				type="text"
																				className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
																				placeholder="p.ej. 16px"
																				value={block.style?.borderRadius || ""}
																				onChange={(e) =>
																					updateBlockStyle(
																						index,
																						"borderRadius",
																						e.target.value
																					)
																				}
																			/>
																		</div>
																		<div>
																			<label className="block mb-1">Padding</label>
																			<input
																				type="text"
																				className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
																				placeholder="p.ej. 8px"
																				value={block.style?.paddingBlock || ""}
																				onChange={(e) =>
																					updateBlockStyle(
																						index,
																						"paddingBlock",
																						e.target.value
																					)
																				}
																			/>
																		</div>
																	</div>
																</div>

																<div className="space-y-2">
																	<label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
																		Texto alternativo (accesibilidad)
																	</label>
																	<input
																		type="text"
																		className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
																		value={block.alt || ""}
																		onChange={(e) =>
																			updateBlock(index, (b) => ({
																				...(b as any),
																				alt: e.target.value,
																			}))
																		}
																	/>
																	<label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2">
																		Leyenda (se muestra debajo de la imagen)
																	</label>
																	<textarea
																		className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm min-h-[60px]"
																		value={block.caption || ""}
																		onChange={(e) =>
																			updateBlock(index, (b) => ({
																				...(b as any),
																				caption: e.target.value,
																			}))
																		}
																	/>
																</div>
															</div>
														</div>
													)}
												</div>
											))
										) : (
											<p className="text-xs text-slate-500 dark:text-slate-400">
												Añade subtítulos, párrafos o imágenes para construir el contenido del
												blog. Puedes agregar varias imágenes seguidas de párrafos según lo que
												necesites.
											</p>
										)}
									</div>

									<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-700 mt-2">
										<div className="text-xs text-slate-500 dark:text-slate-400">
											Estado actual:{" "}
											<span className="font-semibold text-slate-700 dark:text-slate-200">
												{editingBlog.status === "published"
													? "Publicado"
													: "Borrador (sin publicar)"}
											</span>
										</div>
										<div className="flex flex-wrap gap-2 justify-end">
											<button
												type="button"
												disabled={saving}
												onClick={() => handleSave("draft")}
												className="inline-flex items-center gap-1 px-4 py-2 rounded-full border border-slate-400 text-slate-800 dark:text-slate-100 text-xs font-semibold bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
											>
												<span className="material-icons-round text-sm">save</span>
												Guardar borrador
											</button>
											<button
												type="button"
												disabled={saving}
												onClick={() => handleSave("published")}
												className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
											>
												<span className="material-icons-round text-sm">publish</span>
												Publicar
											</button>
										</div>
									</div>
								</>
							)}
						</div>
					</section>

					{/* Previsualización */}
					<section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 md:p-5 flex flex-col min-h-[360px]">
						<div className="flex items-center justify-between mb-3">
							<div className="flex items-center gap-2">
								<span className="material-icons-round text-slate-500">visibility</span>
								<h2 className="font-semibold text-sm">Previsualización</h2>
							</div>
							<div className="flex items-center gap-2 text-xs">
								<div className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 p-0.5">
									<button
										type="button"
										onClick={() => setPreviewDevice("desktop")}
										className={`px-2.5 py-1 rounded-full flex items-center gap-1 ${
											previewDevice === "desktop"
												? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow"
												: "text-slate-500"
										}`}
									>
										<span className="material-icons-round text-sm">desktop_windows</span>
										Desktop
									</button>
									<button
										type="button"
										onClick={() => setPreviewDevice("mobile")}
										className={`px-2.5 py-1 rounded-full flex items-center gap-1 ${
											previewDevice === "mobile"
												? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow"
												: "text-slate-500"
										}`}
									>
										<span className="material-icons-round text-sm">smartphone</span>
										Móvil
									</button>
								</div>
								<button
									type="button"
									onClick={() => setShowPreviewModal(true)}
									disabled={!previewBlog}
									className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
								>
									<span className="material-icons-round text-base">visibility</span>
								</button>
							</div>
						</div>

						<div className="flex-1 overflow-auto py-2">
							{previewBlog ? (
								<BlogPreview blog={previewBlog} device={previewDevice} />
							) : (
								<p className="text-xs text-slate-500 dark:text-slate-400">
									Crea o selecciona un blog para ver la previsualización.
								</p>
							)}
						</div>
					</section>
				</div>
			</div>

			{showPreviewModal && previewBlog && (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					<div
						className="absolute inset-0 bg-black/60"
						onClick={() => setShowPreviewModal(false)}
					/>
					<div className="relative z-10 bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
						<div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
							<div className="flex items-center gap-2 text-sm">
								<span className="material-icons-round text-slate-500">visibility</span>
								<span>Vista previa ampliada</span>
							</div>
							<div className="flex items-center gap-2 text-xs">
								<div className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 p-0.5">
									<button
										type="button"
										onClick={() => setPreviewDevice("desktop")}
										className={`px-2.5 py-1 rounded-full flex items-center gap-1 ${
											previewDevice === "desktop"
												? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow"
												: "text-slate-500"
										}`}
									>
										<span className="material-icons-round text-sm">desktop_windows</span>
										Desktop
									</button>
									<button
										type="button"
										onClick={() => setPreviewDevice("mobile")}
										className={`px-2.5 py-1 rounded-full flex items-center gap-1 ${
											previewDevice === "mobile"
												? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow"
												: "text-slate-500"
										}`}
									>
										<span className="material-icons-round text-sm">smartphone</span>
										Móvil
									</button>
								</div>
								<button
									type="button"
									onClick={() => setShowPreviewModal(false)}
									className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
								>
									<span className="material-icons-round text-base">close</span>
								</button>
							</div>
						</div>
						<div className="flex-1 overflow-auto px-4 py-4">
							<BlogPreview blog={previewBlog} device={previewDevice} />
						</div>
					</div>
				</div>
			)}
		</div>
	);
}


