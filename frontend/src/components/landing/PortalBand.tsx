import { motion } from "motion/react";
import { scrollToId } from "@/lib/scroll";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function PortalBand() {
  return (
    <section className="relative h-[70vh] overflow-hidden" data-testid="portal-band">
      <img
        src="/assets/hero/concept-portal.webp"
        alt="Player stepping through a neon portal into a virtual world"
        loading="lazy"
        className="animate-kenburns absolute inset-0 h-full w-full object-cover opacity-80"
      />
      {/* blend into page background */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#050811] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#050811] to-transparent" />
      <div className="absolute inset-0 bg-[#050811]/30" />

      {/* warp rings pulsing toward the viewer */}
      <div className="absolute inset-0" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="warp-ring absolute left-1/2 top-1/2 h-44 w-44 rounded-full border-2 border-[#00f0ff]/50"
            style={{ animationDelay: `${i * 0.9}s` }}
          />
        ))}
      </div>

      <div className="relative z-10 flex h-full flex-col items-center justify-end pb-16 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-glow font-heading text-3xl font-black uppercase tracking-tight text-white sm:text-4xl lg:text-5xl"
        >
          Step into another world
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
          viewport={{ once: true, margin: "-100px" }}
          className="mt-3 font-mono text-xs uppercase tracking-[0.3em] text-[#00f0ff]/80"
        >
          Nine attractions · Zero cables · One quote away
        </motion.p>
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.3 }}
          viewport={{ once: true, margin: "-100px" }}
          onClick={() => scrollToId("products")}
          className="pointer-events-auto mt-6 rounded-full border border-[#00f0ff]/50 bg-[#050811]/60 px-6 py-3 font-heading text-xs font-bold uppercase tracking-[0.15em] text-[#00f0ff] backdrop-blur-md transition-colors duration-200 hover:bg-[#00f0ff] hover:text-[#050811]"
          data-testid="portal-cta"
        >
          See the catalogue
        </motion.button>
      </div>
    </section>
  );
}
