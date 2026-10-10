import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { scrollToId } from "@/lib/scroll";

const LINKS = [
  { label: "Products", id: "products" },
  { label: "Pricing", id: "pricing" },
  { label: "Experience", id: "experience" },
  { label: "FAQ", id: "faq" },
  { label: "Contact", id: "enquiry" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
      className={`fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-500 ${
        scrolled
          ? "backdrop-blur-2xl bg-[#050811]/85 border-b border-[#00f0ff]/15 shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
          : "bg-transparent border-b border-transparent"
      }`}
      data-testid="main-nav"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-3"
          data-testid="nav-logo"
          aria-label="Halucinate home"
        >
          <img
            src="/assets/brand/halucinate-white.png"
            alt="Halucinate"
            className="h-7 w-auto mix-blend-screen"
          />
        </button>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <button
              key={l.id}
              onClick={() => scrollToId(l.id)}
              className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400 transition-colors duration-200 hover:text-[#00f0ff]"
              data-testid={`nav-link-${l.id}`}
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="/admin/login"
            className="hidden font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500 transition-colors duration-200 hover:text-[#00f0ff] sm:block"
            data-testid="nav-admin-link"
          >
            Admin
          </a>
          <button
            onClick={() => scrollToId("enquiry")}
            className="animate-neon-pulse rounded-full bg-[#00f0ff] px-5 py-2 font-heading text-xs font-bold uppercase tracking-[0.15em] text-[#050811] transition-transform duration-200 hover:scale-105"
            data-testid="nav-cta-button"
          >
            Request Pricing
          </button>
        </div>
      </div>
    </motion.header>
  );
}
