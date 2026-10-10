import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { startLenis, stopLenis } from "@/lib/scroll";
import Home from "@/pages/Home";
import AdminLogin from "@/pages/AdminLogin";
import Admin from "@/pages/Admin";

export default function App() {
  useEffect(() => {
    startLenis();
    return () => stopLenis();
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
      <Toaster richColors theme="dark" position="bottom-right" />
    </>
  );
}
