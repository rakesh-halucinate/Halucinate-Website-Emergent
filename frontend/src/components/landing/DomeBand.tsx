import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { scrollToId } from "@/lib/scroll";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const SCENES = [
  { src: "/assets/hero/concept-dome-a.webp", label: "Ocean worlds" },
  { src: "/assets/hero/concept-dome-b.webp", label: "Deep space" },
];

export default function DomeBand() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % SCENES.length), 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative h-[85vh] overflow-hidden border-y border-[#00f0ff]/10" data-testid="dome-band">
      {SCENES.map((s, i) => (
        <img
          key={s.src}
          src={s.src}
          alt={`Super Reality 360 Dome projecting ${s.label}`}
          loading="lazy"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[2000ms] ease-out ${
            active === i ? "opacity-85" : "opacity-0"
          }`}
        />
      ))}
      {/* shimmer sweep + blends */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="animate-glint h-full w-1/4 bg-gradient-to-r from-transparent via-[#00f0ff]/10 to-transparent" />
      </div>
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#050811] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#050811] to-transparent" />

      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-5 pb-16 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
          viewport={{ once: true, margin: "-100px" }}
          className="max-w-xl"
        >
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-[#00f0ff]">
            Super Reality 360 Dome
          </p>
          <h2 className="font-heading text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl">
            One room. Any universe.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-300/90">
            Projection wraps every wall while scenes cycle from ocean depths to deep space —
            a shared show your visitors will travel for.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              onClick={() => scrollToId("enquiry")}
              className="rounded-full bg-[#00f0ff] px-6 py-3 font-heading text-xs font-bold uppercase tracking-[0.15em] text-[#050811] transition-transform duration-200 hover:scale-105"
              data-testid="dome-cta"
            >
              Enquire about the dome
            </button>
            <div className="flex items-center gap-2" data-testid="dome-scene-dots">
              {SCENES.map((s, i) => (
                <button
                  key={s.src}
                  onClick={() => setActive(i)}
                  aria-label={`Show ${s.label}`}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    active === i ? "w-8 bg-[#00f0ff]" : "w-3 bg-[#00f0ff]/30"
                  }`}
                  data-testid={`dome-dot-${i}`}
                />
              ))}
              <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">
                {SCENES[active].label}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
