import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import VRAmbientScene from "./VRAmbientScene";
import HeroVisual from "./HeroVisual";
import { scrollToId } from "@/lib/scroll";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const LINES = [
  { text: "IMMERSIVE", accent: false },
  { text: "ENTERTAINMENT.", accent: true },
  { text: "ENGINEERED FOR BUSINESS.", accent: false },
];

export default function Hero() {
  return (
    <section
      className="scanline relative flex min-h-screen items-center overflow-hidden bg-[#050811]"
      data-testid="hero-section"
    >
      {/* 3D ambient scene + floating headset with orbiting products */}
      <div className="absolute inset-0 opacity-70 md:opacity-100">
        <VRAmbientScene />
      </div>
      <HeroVisual />
      <div className="hero-scrim pointer-events-none absolute inset-0" />
      <div className="bg-cyber-grid pointer-events-none absolute inset-0 opacity-40" />

      {/* content */}
      <div className="pointer-events-none relative z-10 mx-auto w-full max-w-7xl px-5 pt-28 pb-20 lg:px-8">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
            className="pointer-events-auto mb-8 inline-flex items-center gap-3 rounded-full border border-[#00f0ff]/30 bg-[#002b3d]/40 px-4 py-1.5 backdrop-blur-md"
            data-testid="hero-badge"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00f0ff]" />
            <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#00f0ff]">
              VR · Immersive · Kiosks · Events
            </span>
          </motion.div>

          <h1 className="font-heading text-4xl font-black uppercase leading-[0.98] tracking-tight text-white sm:text-5xl lg:text-6xl">
            {LINES.map((line, i) => (
              <span key={line.text} className="block overflow-hidden pb-1">
                <motion.span
                  className={`block ${line.accent ? "text-glow text-[#00f0ff]" : ""}`}
                  initial={{ y: "115%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.9, ease: EASE, delay: 0.45 + i * 0.14 }}
                >
                  {line.text}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 1.05 }}
            className="mt-7 max-w-xl text-base leading-relaxed text-slate-300/90 sm:text-lg"
            data-testid="hero-subtitle"
          >
            Halucinate designs and delivers advanced VR attractions, immersive entertainment
            systems, automated kiosks, physical experiences and custom event activations for
            malls, entertainment centres, businesses and destinations across India.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 1.2 }}
            className="pointer-events-auto mt-10 flex flex-wrap items-center gap-4"
          >
            <button
              onClick={() => scrollToId("products")}
              className="group inline-flex items-center gap-2 rounded-full bg-[#00f0ff] px-7 py-3.5 font-heading text-sm font-bold uppercase tracking-[0.12em] text-[#050811] transition-transform duration-200 hover:scale-105"
              data-testid="hero-explore-button"
            >
              Explore Products
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => scrollToId("enquiry")}
              className="rounded-full border border-[#00f0ff]/40 px-7 py-3.5 font-heading text-sm font-bold uppercase tracking-[0.12em] text-[#00f0ff] transition-colors duration-200 hover:bg-[#00f0ff]/10"
              data-testid="hero-pricing-button"
            >
              Request Pricing
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.6 }}
            className="mt-14 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#00f0ff]/60" />
            9 turnkey attractions · deployed across India
          </motion.div>
        </div>
      </div>

      {/* bottom fade */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#050811] to-transparent" />
    </section>
  );
}
