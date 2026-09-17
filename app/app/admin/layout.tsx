"use client";
import Sidebar from "../components/Sidebar";
import BottomBar from "../components/BottomBar";
import { useEffect, useState } from "react";
import { getCurrentUser } from "../lib/firebase-auth";

export default function HomeLayout({ children }) {
  const [role, setRole] = useState("admin");
  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user?.role === "admin") setRole("admin");
      else setRole("admin");
    });
  }, []);
  return (
    
    <div className="flex overflow-x-auto">

      <Sidebar role={role} />
      <main className="flex-1">
        {children}
      </main>
      <BottomBar role={role} />
    </div>
  );
}
