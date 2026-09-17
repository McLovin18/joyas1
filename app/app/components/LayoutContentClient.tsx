"use client";
import { useOnboarding } from "../context/OnboardingContext";
import { usePathname } from "next/navigation";
import { UserProvider } from "../context/UserContext";
import { SiteSettingsProvider } from "../context/SiteSettingsContext";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ToastContainer from "./ToastContainer";
import { useTrackPageView } from "../lib/useAnalytics";

export default function LayoutContentClient({ children }: { children: React.ReactNode }) {
  const { showWelcomeGlobal } = useOnboarding();
  const pathname = usePathname();
  
  // Track page views globally
  useTrackPageView(!(pathname && pathname.startsWith("/admin")));
  
  // Si estamos en /login y showWelcomeGlobal, solo renderiza children (el modal)
  if (pathname === "/login" && showWelcomeGlobal) {
    return <>{children}</>;
  }
  return (
    <UserProvider>
      <SiteSettingsProvider>
        <ToastContainer />
        <Navbar />
        {children}
        <Footer />
      </SiteSettingsProvider>
    </UserProvider>
  );
}
