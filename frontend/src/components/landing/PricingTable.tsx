import { motion } from "motion/react";
import type { Product } from "@/lib/data";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function PricingTable({ products }: { products: Product[] }) {
  return (
    <section id="pricing" className="relative border-y border-[#1e293b] bg-[#070c18]" data-testid="pricing-section">
      <div className="mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          viewport={{ once: true, margin: "-80px" }}
          className="mb-12"
        >
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-[#00f0ff]">Indicative Pricing</p>
          <h2 className="font-heading text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl">
            General starting prices
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
          viewport={{ once: true, margin: "-60px" }}
          className="overflow-x-auto rounded-2xl border border-[#1e293b] bg-[#0b1120]"
        >
          <table className="w-full min-w-[560px] text-left" data-testid="pricing-table">
            <thead>
              <tr className="border-b border-[#00f0ff]/20">
                <th className="px-6 py-4 font-mono text-[11px] uppercase tracking-[0.25em] text-[#00f0ff]">Product</th>
                <th className="px-6 py-4 font-mono text-[11px] uppercase tracking-[0.25em] text-[#00f0ff]">Category</th>
                <th className="px-6 py-4 text-right font-mono text-[11px] uppercase tracking-[0.25em] text-[#00f0ff]">Starting Price</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr
                  key={p.id}
                  className={`transition-colors duration-200 hover:bg-[#00f0ff]/5 ${i % 2 === 0 ? "bg-white/[0.015]" : ""}`}
                  data-testid={`pricing-row-${p.id}`}
                >
                  <td className="px-6 py-4 font-heading text-sm font-semibold text-white">{p.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{p.tag}</td>
                  <td className="px-6 py-4 text-right font-heading text-sm font-bold text-[#00f0ff]">{p.price_label || "On request"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        <p className="mt-6 max-w-3xl text-xs leading-relaxed text-slate-500" data-testid="pricing-disclaimer">
          All prices are indicative starting prices and may vary based on specifications, hardware
          configuration, space, location, transportation, installation, customisation and applicable
          taxes. GST will be charged additionally wherever applicable.
        </p>
      </div>
    </section>
  );
}
