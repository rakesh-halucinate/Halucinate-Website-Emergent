import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Cpu, Wrench, GraduationCap, LifeBuoy } from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const PILLARS = [
  { icon: Cpu, title: "Hardware + Software", text: "Headsets, PCs, sensors, kiosks and licensed game content — one vendor, zero guesswork." },
  { icon: Wrench, title: "Installation", text: "Site planning, networking, calibration and testing handled end-to-end by our deployment team." },
  { icon: GraduationCap, title: "Operator Training", text: "Your staff learns to run, reset and monetise every attraction from day one." },
  { icon: LifeBuoy, title: "Ongoing Support", text: "Technical support and new content drops as each platform expands." },
];

export default function ImmersiveSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const yA = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const yB = useTransform(scrollYProgress, [0, 1], [120, -80]);

  return (
    <section id="experience" ref={ref} className="relative mx-auto max-w-7xl overflow-hidden px-5 py-24 lg:px-8 lg:py-32" data-testid="experience-section">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="relative order-2 h-[480px] lg:order-1">
          <motion.div
            style={{ y: yA }}
            className="absolute left-0 top-4 w-3/4 overflow-hidden rounded-2xl border border-[#00f0ff]/25 shadow-[0_0_60px_rgba(0,240,255,0.15)]"
          >
            <img src="/assets/hero/concept-arena.webp" alt="Multiplayer free-roam VR arena in action" className="animate-kenburns h-72 w-full object-cover" loading="lazy" />
          </motion.div>
          <motion.div
            style={{ y: yB }}
            className="absolute bottom-0 right-0 w-2/3 overflow-hidden rounded-2xl border border-[#ff2d78]/25 shadow-[0_0_60px_rgba(255,45,120,0.12)]"
          >
            <img src="/assets/hero/vr-motion-person.jpg" alt="Player wearing a Halucinate VR headset in motion" className="animate-kenburns h-64 w-full object-cover" loading="lazy" />
          </motion.div>
        </div>

        <div className="order-1 lg:order-2">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            viewport={{ once: true, margin: "-80px" }}
          >
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-[#00f0ff]">Turnkey Delivery</p>
            <h2 className="font-heading text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl">
              You bring the space. We bring the future.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-400">
              Every Halucinate attraction ships as a complete operating business — from CAD layout
              to launch day — so malls, resorts, gaming centres and event teams can switch on
              revenue immediately.
            </p>
          </motion.div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {PILLARS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE, delay: i * 0.08 }}
                viewport={{ once: true, margin: "-40px" }}
                className="rounded-xl border border-[#1e293b] bg-[#0b1120] p-5 transition-[border-color,box-shadow] duration-300 hover:border-[#00f0ff]/40 hover:shadow-[0_0_30px_rgba(0,240,255,0.1)]"
                data-testid={`pillar-${i}`}
              >
                <p.icon className="mb-3 h-5 w-5 text-[#00f0ff]" />
                <h3 className="font-heading text-sm font-bold uppercase tracking-wide text-white">{p.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{p.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
