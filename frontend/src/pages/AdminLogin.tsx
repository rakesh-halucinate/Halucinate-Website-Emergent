import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Lock } from "lucide-react";
import { apiPost, ApiError } from "@/lib/api";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiPost("/auth/login", { email, password });
      navigate("/admin");
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.body as { detail?: string } | null)?.detail;
        setError(typeof detail === "string" ? detail : "Login failed. Check your credentials.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-cyber-grid flex min-h-screen items-center justify-center bg-[#050811] px-5" data-testid="admin-login-page">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="neon-ring w-full max-w-sm rounded-2xl bg-[#0b1120]/90 p-8 backdrop-blur-xl"
      >
        <div className="mb-8 text-center">
          <img src="/assets/brand/halucinate-white.png" alt="Halucinate" className="mx-auto mb-5 h-8 w-auto mix-blend-screen" />
          <p className="flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-[#00f0ff]">
            <Lock className="h-3 w-3" /> Restricted Access
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4" data-testid="admin-login-form">
          <div>
            <label className="mb-1.5 block text-xs text-slate-400" htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin email"
              className="w-full rounded-lg border border-[#1e293b] bg-[#050811] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[#00f0ff]/60"
              data-testid="admin-login-email"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-slate-400" htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-[#1e293b] bg-[#050811] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[#00f0ff]/60"
              data-testid="admin-login-password"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-[#ff4466]/40 bg-[#ff4466]/10 px-3 py-2 text-xs text-[#ff4466]" data-testid="admin-login-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#00f0ff] py-3 font-heading text-sm font-bold uppercase tracking-[0.15em] text-[#050811] transition-transform duration-200 hover:scale-[1.02] disabled:opacity-50"
            data-testid="admin-login-submit"
          >
            {loading ? "Authenticating…" : "Enter Console"}
          </button>
        </form>

        <a href="/" className="mt-6 block text-center font-mono text-[10px] uppercase tracking-[0.25em] text-slate-600 transition-colors hover:text-[#00f0ff]" data-testid="admin-login-back">
          ← Back to site
        </a>
      </motion.div>
    </div>
  );
}
