import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
import type { Product } from "@/lib/data";
import { scrollToId } from "@/lib/scroll";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function addToEnquiry(name: string) {
  window.dispatchEvent(new CustomEvent("hlc:add-product", { detail: name }));
  scrollToId("enquiry");
}

export default function Products({ products }: { products: Product[] }) {
  const [highlight, setHighlight] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const chip = ((e as CustomEvent<string>).detail || "").toLowerCase();
      const match = products.find((p) => p.name.toLowerCase().includes(chip));
      if (!match) return;
      scrollToId(`product-${match.id}`);
      setHighlight(match.id);
      setTimeout(() => setHighlight(null), 2600);
    };
    window.addEventListener("hlc:goto-product", handler);
    return () => window.removeEventListener("hlc:goto-product", handler);
  }, [products]);
  return (
    <section id="products" className="relative mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32" data-testid="products-section">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        viewport={{ once: true, margin: "-80px" }}
        className="mb-14"
      >
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-[#00f0ff]">The Catalogue</p>
        <h2 className="font-heading text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl">
          Attractions that pull crowds.
        </h2>
        <p className="mt-4 max-w-2xl text-base text-slate-400">
          Nine turnkey entertainment systems — engineered, installed and supported across India.
        </p>
      </motion.div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {products.map((p, i) => (
          <motion.article
            key={p.id}
            initial={{ opacity: 0, y: 34 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: EASE, delay: (i % 3) * 0.08 }}
            viewport={{ once: true, margin: "-60px" }}
            whileHover={{ y: -6 }}
            id={`product-${p.id}`}
            className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-[#0b1120] transition-[border-color,box-shadow] duration-300 hover:border-[#00f0ff]/50 hover:shadow-[0_0_40px_rgba(0,240,255,0.12)] ${
              highlight === p.id
                ? "border-[#00f0ff] shadow-[0_0_50px_rgba(0,240,255,0.35)]"
                : "border-[#1e293b]"
            } ${i === 0 ? "md:col-span-2" : ""}`}
            data-testid={`product-card-${p.id}`}
          >
            <div className={`relative overflow-hidden ${i === 0 ? "h-64 lg:h-80" : "h-48"}`}>
              <img
                src={p.image_url}
                alt={`${p.name} by Halucinate`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b1120] via-transparent to-transparent" />
              {p.tag && (
                <span className="absolute left-4 top-4 rounded-full border border-[#00f0ff]/40 bg-[#050811]/80 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[#00f0ff] backdrop-blur-md">
                  {p.tag}
                </span>
              )}
            </div>

            <div className="flex flex-1 flex-col p-6">
              <h3 className="font-heading text-xl font-bold text-white sm:text-2xl">{p.name}</h3>
              <p className="mt-3 line-clamp-4 flex-1 text-sm leading-relaxed text-slate-400">
                {p.description}
              </p>
              {p.hashtags.length > 0 && (
                <p className="mt-3 font-mono text-[10px] tracking-wide text-[#00f0ff]/50">
                  {p.hashtags.slice(0, 4).join(" ")}
                </p>
              )}
              <div className="mt-5 flex items-center justify-between border-t border-[#1e293b] pt-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Starting</p>
                  <p className="font-heading text-base font-bold text-[#00f0ff]">{p.price_label || "On request"}</p>
                </div>
                <button
                  onClick={() => addToEnquiry(p.name)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#00f0ff]/40 px-4 py-2 font-heading text-xs font-bold uppercase tracking-[0.12em] text-[#00f0ff] transition-colors duration-200 hover:bg-[#00f0ff] hover:text-[#050811]"
                  data-testid={`add-enquiry-${p.id}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Enquire
                </button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
