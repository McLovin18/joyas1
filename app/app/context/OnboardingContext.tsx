"use client";
import { createContext, useContext, useState } from "react";

interface OnboardingContextType {
  showWelcomeGlobal: boolean;
  setShowWelcomeGlobal: (v: boolean) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [showWelcomeGlobal, setShowWelcomeGlobal] = useState(false);
  return (
    <OnboardingContext.Provider value={{ showWelcomeGlobal, setShowWelcomeGlobal }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}

