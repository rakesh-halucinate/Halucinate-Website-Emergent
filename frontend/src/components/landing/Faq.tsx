import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { FAQS } from "@/lib/data";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-4xl px-5 py-24 lg:px-8 lg:py-32" data-testid="faq-section">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        viewport={{ once: true, margin: "-80px" }}
        className="mb-12"
      >
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-[#00f0ff]">Answers</p>
        <h2 className="font-heading text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl">
          Frequently asked questions
        </h2>
      </motion.div>

      <div className="space-y-3">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <motion.div
              key={f.q}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: i * 0.05 }}
              viewport={{ once: true, margin: "-40px" }}
              className={`overflow-hidden rounded-xl border backdrop-blur-md transition-colors duration-300 ${
                isOpen ? "border-[#00f0ff]/40 bg-[#0b1120]/90" : "border-[#1e293b] bg-[#0b1120]/50"
              }`}
              data-testid={`faq-item-${i}`}
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                data-testid={`faq-toggle-${i}`}
                aria-expanded={isOpen}
              >
                <span className="font-heading text-sm font-semibold text-white sm:text-base">{f.q}</span>
                <Plus
                  className={`h-4 w-4 shrink-0 text-[#00f0ff] transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                  >
                    <p className="px-6 pb-6 text-sm leading-relaxed text-slate-400" data-testid={`faq-answer-${i}`}>
                      {f.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
