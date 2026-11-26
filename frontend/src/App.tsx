import { lazy, Suspense, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { startLenis, stopLenis } from "@/lib/scroll";
import Home from "@/pages/Home";
import ProductPage from "@/pages/ProductPage";

// The admin console (charts, tables) is not needed by visitors; keep it out of the public bundle.
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
const Admin = lazy(() => import("@/pages/Admin"));

export default function App() {
  useEffect(() => {
    startLenis();
    return () => stopLenis();
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products/:slug" element={<ProductPage />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<ProductPage />} />
        </Routes>
      </Suspense>
      <Toaster richColors theme="dark" position="bottom-right" />
    </>
  );
}
