
"use client";
import React, { useState, useEffect, useRef } from "react";

interface Step {
	title: string;
	description: string;
	targetSelector?: string;
}

// Define los pasos aquí o recíbelos por props si lo prefieres
const steps: Step[] = [
	{
		title: "¡Bienvenido a Marca Estilo!",
		description: "Aquí podrás gestionar tus pedidos, productos y mucho más. Te mostraremos las funciones principales.",
	},
	{
		title: "Explora los productos",
		description: "Aquí puedes ver todos los productos disponibles en la tienda.",
		targetSelector: '[data-onboarding="productos"]',
	},
	{
		title: "Tus órdenes",
		description: "Consulta el historial y estado de tus pedidos desde aquí.",
		targetSelector: '[data-onboarding="ordenes"]',
	},
	{
		title: "Configuración",
		description: "Personaliza tu experiencia y ajusta tus preferencias en la configuración.",
		targetSelector: '[data-onboarding="configuracion"]',
	},
	{
		title: "Carrito de compras",
		description: "Accede rápidamente a los productos que has agregado a tu carrito.",
		targetSelector: '[data-onboarding="carrito"]',
	},
	{
		title: "Favoritos",
		description: "Guarda productos que te interesen para verlos después en tu lista de favoritos.",
		targetSelector: '[data-onboarding="favoritos"]',
	},
	{
		title: "Tu perfil de usuario",
		description: "Desde aquí puedes ver tu perfil, cambiar tu información y cerrar sesión.",
		targetSelector: '[data-onboarding="usuario"]',
	},
];

type PopToolOnboardingProps = {
	onFinish?: () => void;
	layoutReady?: boolean;
	mode?: "welcome";
	onReady?: () => void;
};

export default function PopToolOnboarding({ onFinish, layoutReady, mode, onReady }: PopToolOnboardingProps) {
	// Solo mostrar en desktop
	const [isDesktop, setIsDesktop] = useState(true);
	useEffect(() => {
		function check() {
			setIsDesktop(window.innerWidth >= 768);
		}
		check();
		window.addEventListener("resize", check);
		return () => window.removeEventListener("resize", check);
	}, []);
	if (!isDesktop) return null;

	// Si mode==='welcome', solo mostrar el paso 0
	// Si mode no es welcome, empieza en el paso 1 (evita mostrar bienvenida en home)
	const [step, setStep] = useState(mode === "welcome" ? 0 : 1);
	const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; width: number; height: number; windowWidth: number } | null>(null);
	const [readyToShow, setReadyToShow] = useState(false);
	const popoverRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (mode === "welcome") {
			setPopoverPos({
				top: window.innerHeight / 2,
				left: window.innerWidth / 2,
				width: 0,
				height: 0,
				windowWidth: window.innerWidth
			});
			setReadyToShow(true);
			return;
		}
		// Modo contextual: calcula posición según targetSelector
		const selector = steps[step].targetSelector;
		let cleanup: (() => void) | undefined;
		if (selector) {
			const el = document.querySelector(selector) as HTMLElement | null;
			if (el) {
				el.classList.add("poptool-highlight");
				const rect = el.getBoundingClientRect();
				setPopoverPos({
					top: rect.top + window.scrollY,
					left: rect.left + window.scrollX,
					width: rect.width,
					height: rect.height,
					windowWidth: window.innerWidth
				});
				setReadyToShow(true);
				cleanup = () => el.classList.remove("poptool-highlight");
			} else {
				setPopoverPos(null);
				setReadyToShow(false);
			}
		} else {
			setPopoverPos({
				top: window.innerHeight / 2,
				left: window.innerWidth / 2,
				width: 0,
				height: 0,
				windowWidth: window.innerWidth
			});
			setReadyToShow(true);
		}
		return () => {
			if (cleanup) cleanup();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [step, mode]);

	// Llama a onReady solo una vez por ciclo de showWelcome
	const didCallReadyRef = useRef(false);
	useEffect(() => {
		if (readyToShow && popoverRef.current && onReady && !didCallReadyRef.current) {
			didCallReadyRef.current = true;
			onReady();
		}
		// Reset flag si se desmonta
		return () => {
			didCallReadyRef.current = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [readyToShow, popoverRef.current]);

	// Overlay solo para el paso de bienvenida o modo welcome
	const overlay = (mode === "welcome" || step === 0) ? (
		<div style={{
			position: "fixed",
			top: 0,
			left: 0,
			width: "100vw",
			height: "100vh",
			background: "rgba(30, 22, 60, 0.65)",
			zIndex: 100000
		}} />
	) : null;

	// Popover positioning logic
	let popoverStyle: React.CSSProperties = {};
	if ((mode === "welcome" || step === 0) && popoverPos) {
		popoverStyle = {
			position: "fixed",
			top: "50%",
			left: "50%",
			transform: "translate(-50%, -50%)",
			maxWidth: 340,
			minWidth: 240,
			width: 300,
			zIndex: 100001
		};
	} else if (popoverPos) {
		// Otros pasos: popover flotante junto al target
		const POPOVER_WIDTH = 300;
		let left = popoverPos.left + popoverPos.width / 2 - POPOVER_WIDTH / 2;
		if (left + POPOVER_WIDTH > popoverPos.windowWidth - 8) {
			left = popoverPos.windowWidth - POPOVER_WIDTH - 8;
		}
		if (left < 8) left = 8;
		popoverStyle = {
			position: "absolute",
			top: popoverPos.top + popoverPos.height + 12,
			left,
			maxWidth: POPOVER_WIDTH,
			minWidth: 220,
			width: POPOVER_WIDTH,
			zIndex: 100001
		};
	}

	// No renderizar nada hasta que esté listo
	if (!popoverPos || !readyToShow || (typeof layoutReady !== "undefined" && !layoutReady)) return null;
	if (mode === "welcome" && step !== 0) return null;

	// Handlers
	const handleNext = () => {
		if (mode === "welcome") {
			onFinish?.();
			return;
		}
		if (step < steps.length - 1) {
			setStep(step + 1);
		} else {
			onFinish?.();
		}
	};

	return (
		<>
			{overlay}
			<div
				ref={popoverRef}
				className={
					`poptool-popover animate-poptool-bounce fixed` +
					((mode === "welcome" || step === 0)
						? " bg-gradient-to-br from-[#E0A11A] via-[#a78bfa] to-[#f3e8ff] dark:from-[#3a1859] dark:via-[#E0A11A] dark:to-[#1e1b2e] text-white shadow-2xl border-0 p-7"
						: " bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-1 border border-slate-200 dark:border-slate-700 text-center"
					)
				}
				style={popoverStyle}
			>
				<div className={(mode === "welcome" || step === 0) ? "flex flex-col items-center gap-3" : undefined}>
					{(mode === "welcome" || step === 0) && (
						<div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-2 animate-poptool-welcome-bounce">
							<span className="material-icons-round text-5xl text-white/90 drop-shadow-lg">rocket_launch</span>
						</div>
					)}
					<h2 className={
						(mode === "welcome" || step === 0)
							? "text-2xl font-extrabold mb-2 drop-shadow-lg text-white"
							: "text-xl font-bold mb-2 text-[#3a1859] dark:text-white"
					}>{steps[mode === "welcome" ? 0 : step].title}</h2>
					<p className={(mode === "welcome" || step === 0)
						? "text-base font-medium text-white/90 mb-4 drop-shadow"
						: "text-sm text-slate-700 dark:text-slate-200 mb-4"
					}>{steps[mode === "welcome" ? 0 : step].description}</p>
					<button
						className={
							(mode === "welcome" || step === 0)
								? "mt-2 px-6 py-2 bg-white/90 text-black rounded-xl font-bold text-lg shadow hover:bg-white transition"
								: "mt-2 px-4 py-2 bg-[#3a1859] text-white rounded-xl font-semibold hover:bg-[#5a2ca0] transition"
						}
						onClick={handleNext}
					>
						{(mode === "welcome" || step === 0) ? "¡Vamos!" : (step < steps.length - 1 ? "Ok, entiendo" : "¡Empezar!")}
					</button>
				</div>
				<style>{`
					.poptool-highlight {
						outline: 3px solid #a78bfa;
						outline-offset: 2px;
						box-shadow: 0 0 0 8px #a78bfa33;
						transition: outline 0.2s, box-shadow 0.2s;
						z-index: 99999 !important;
					}
					@keyframes poptool-bounce {
						0% { transform: scale(0.9); opacity: 0.7; }
						60% { transform: scale(1.05); opacity: 1; }
						100% { transform: scale(1); opacity: 1; }
					}
					.animate-poptool-bounce {
						animation: poptool-bounce 0.5s cubic-bezier(.68,-0.55,.27,1.55);
					}
					@keyframes poptool-welcome-bounce {
						0% { transform: scale(0.7); opacity: 0.5; }
						60% { transform: scale(1.1); opacity: 1; }
						100% { transform: scale(1); opacity: 1; }
					}
					.animate-poptool-welcome-bounce {
						animation: poptool-welcome-bounce 0.7s cubic-bezier(.68,-0.55,.27,1.55);
					}
				`}</style>
			</div>
		</>
	);
}


