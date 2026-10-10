import type { SeoPublic } from "@/lib/data";
import { scrollToId } from "@/lib/scroll";

export default function Footer({ seo }: { seo: SeoPublic | null }) {
  return (
    <footer className="relative overflow-hidden border-t border-[#00f0ff]/15 bg-[#04060d]" data-testid="site-footer">
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <img src="/assets/brand/halucinate-white.png" alt="Halucinate" className="h-10 w-auto mix-blend-screen" />
            <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-400">
              Immersive entertainment, engineered for business. VR attractions, immersive systems,
              automated kiosks and custom event activations across India.
            </p>
            <a
              href="mailto:rakesh@halucinate.com"
              className="mt-4 inline-block font-mono text-sm text-[#00f0ff] transition-opacity duration-200 hover:opacity-70"
              data-testid="footer-email"
            >
              rakesh@halucinate.com
            </a>
            <div className="mt-3 flex flex-col gap-1">
              <a href="tel:+919632121215" className="w-fit font-mono text-sm text-slate-300 transition-colors duration-200 hover:text-[#00f0ff]" data-testid="footer-phone-1">
                +91 96321 21215
              </a>
              <a href="tel:+919880368600" className="w-fit font-mono text-sm text-slate-300 transition-colors duration-200 hover:text-[#00f0ff]" data-testid="footer-phone-2">
                +91 98803 68600
              </a>
            </div>
          </div>

          <div>
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.25em] text-slate-500">Explore</p>
            <div className="flex flex-col gap-2.5">
              {[
                { label: "Products", id: "products" },
                { label: "Pricing", id: "pricing" },
                { label: "Experience", id: "experience" },
                { label: "FAQ", id: "faq" },
                { label: "Enquire", id: "enquiry" },
              ].map((l) => (
                <button
                  key={l.id}
                  onClick={() => scrollToId(l.id)}
                  className="w-fit text-sm text-slate-400 transition-colors duration-200 hover:text-[#00f0ff]"
                  data-testid={`footer-link-${l.id}`}
                >
                  {l.label}
                </button>
              ))}
              <a href="/admin/login" className="w-fit text-sm text-slate-600 transition-colors duration-200 hover:text-[#00f0ff]" data-testid="footer-admin-link">
                Admin
              </a>
            </div>
          </div>

          <div>
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.25em] text-slate-500">Find us on AI search</p>
            <div className="flex flex-wrap gap-2" data-testid="footer-hashtags">
              {(seo?.hashtags ?? []).slice(0, 12).map((h) => (
                <span
                  key={h}
                  className="rounded-full border border-[#1e293b] px-3 py-1 font-mono text-[10px] text-[#00f0ff]/70"
                >
                  {h.startsWith("#") ? h : `#${h}`}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-[#1e293b] pt-6 sm:flex-row sm:items-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-600">
            © {new Date().getFullYear()} Halucinate · Immersive Entertainment
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-600">
            Made for the experiences of tomorrow
          </p>
        </div>
      </div>

      <div className="pointer-events-none select-none overflow-hidden" aria-hidden="true">
        <p className="translate-y-6 bg-gradient-to-b from-[#00f0ff]/12 to-transparent bg-clip-text text-center font-heading text-[18vw] font-black uppercase leading-none text-transparent">
          halucinate
        </p>
      </div>
    </footer>
  );
}
