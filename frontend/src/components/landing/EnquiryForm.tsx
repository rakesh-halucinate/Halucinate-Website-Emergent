import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import { apiPost, ApiError } from "@/lib/api";
import { BUDGET_OPTIONS, type Product } from "@/lib/data";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const inputCls =
  "w-full rounded-lg border border-[#1e293b] bg-[#050811] px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none transition-[border-color,box-shadow] duration-200 focus:border-[#00f0ff]/60 focus:shadow-[0_0_20px_rgba(0,240,255,0.12)]";

export default function EnquiryForm({ products }: { products: Product[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "", company: "", email: "", mobile: "", city: "", state: "",
    budget: "", space: "", install_date: "", message: "",
  });
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const name = (e as CustomEvent<string>).detail;
      setSelected((prev) => (prev.includes(name) ? prev : [...prev, name]));
    };
    window.addEventListener("hlc:add-product", handler);
    return () => window.removeEventListener("hlc:add-product", handler);
  }, []);

  const toggle = (name: string) =>
    setSelected((prev) => (prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]));

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      toast.error("Please agree to be contacted before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/enquiries", { products: selected, ...form, consent });
      setDone(true);
      toast.success("Enquiry submitted — check your inbox for confirmation.");
    } catch (err) {
      const msg = err instanceof ApiError ? `Submission failed (${err.status}). Please try again.` : "Submission failed. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="enquiry" className="relative border-t border-[#1e293b] bg-[#070c18]" data-testid="enquiry-section">
      <div className="bg-cyber-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative mx-auto max-w-5xl px-5 py-24 lg:px-8 lg:py-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          viewport={{ once: true, margin: "-80px" }}
          className="mb-12 text-center"
        >
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-[#00f0ff]">Start Your Build</p>
          <h2 className="font-heading text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl">
            Tell us what you want to build
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-400">
            Share your requirement and our team will contact you with suitable product options,
            general pricing and the next steps.
          </p>
        </motion.div>

        {done ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="neon-ring mx-auto max-w-xl rounded-2xl bg-[#0b1120] p-10 text-center"
            data-testid="enquiry-success"
          >
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-[#00f0ff]" />
            <h3 className="font-heading text-xl font-bold text-white">Enquiry received.</h3>
            <p className="mt-3 text-sm text-slate-400">
              A confirmation email is on its way to you, and our team has been notified. Expect a
              call or email shortly with options and pricing.
            </p>
            <button
              onClick={() => { setDone(false); setForm({ name: "", company: "", email: "", mobile: "", city: "", state: "", budget: "", space: "", install_date: "", message: "" }); setSelected([]); setConsent(false); }}
              className="mt-6 rounded-full border border-[#00f0ff]/40 px-6 py-2.5 font-heading text-xs font-bold uppercase tracking-[0.15em] text-[#00f0ff] transition-colors duration-200 hover:bg-[#00f0ff]/10"
              data-testid="enquiry-again-button"
            >
              Submit another enquiry
            </button>
          </motion.div>
        ) : (
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
            viewport={{ once: true, margin: "-60px" }}
            className="rounded-2xl border border-[#1e293b] bg-[#0b1120]/80 p-6 backdrop-blur-md sm:p-10"
            data-testid="enquiry-form"
          >
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.25em] text-slate-400">
              Products interested in (select one or more)
            </p>
            <div className="mb-8 flex flex-wrap gap-2" data-testid="enquiry-product-pills">
              {products.map((p) => {
                const active = selected.includes(p.name);
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => toggle(p.name)}
                    className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors duration-200 ${
                      active
                        ? "border-[#00f0ff] bg-[#00f0ff] text-[#050811]"
                        : "border-[#1e293b] bg-transparent text-slate-300 hover:border-[#00f0ff]/50 hover:text-[#00f0ff]"
                    }`}
                    data-testid={`pill-${p.id}`}
                    aria-pressed={active}
                  >
                    {p.name}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => toggle("Other")}
                className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors duration-200 ${
                  selected.includes("Other")
                    ? "border-[#00f0ff] bg-[#00f0ff] text-[#050811]"
                    : "border-[#1e293b] text-slate-300 hover:border-[#00f0ff]/50 hover:text-[#00f0ff]"
                }`}
                data-testid="pill-other"
                aria-pressed={selected.includes("Other")}
              >
                Other
              </button>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs text-slate-400" htmlFor="enq-name">Full name *</label>
                <input id="enq-name" required className={inputCls} value={form.name} onChange={set("name")} placeholder="Your full name" data-testid="enquiry-name" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-slate-400" htmlFor="enq-company">Company name (optional)</label>
                <input id="enq-company" className={inputCls} value={form.company} onChange={set("company")} placeholder="Company / venue" data-testid="enquiry-company" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-slate-400" htmlFor="enq-email">Email address *</label>
                <input id="enq-email" required type="email" className={inputCls} value={form.email} onChange={set("email")} placeholder="you@company.com" data-testid="enquiry-email" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-slate-400" htmlFor="enq-mobile">Mobile number *</label>
                <input id="enq-mobile" required className={inputCls} value={form.mobile} onChange={set("mobile")} placeholder="+91" data-testid="enquiry-mobile" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-slate-400" htmlFor="enq-city">City (optional)</label>
                <input id="enq-city" className={inputCls} value={form.city} onChange={set("city")} placeholder="City" data-testid="enquiry-city" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-slate-400" htmlFor="enq-state">State (optional)</label>
                <input id="enq-state" className={inputCls} value={form.state} onChange={set("state")} placeholder="State" data-testid="enquiry-state" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-slate-400" htmlFor="enq-budget">Estimated budget (optional)</label>
                <select id="enq-budget" className={inputCls} value={form.budget} onChange={set("budget")} data-testid="enquiry-budget">
                  <option value="">Select budget</option>
                  {BUDGET_OPTIONS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-slate-400" htmlFor="enq-space">Available space (optional)</label>
                <input id="enq-space" className={inputCls} value={form.space} onChange={set("space")} placeholder="e.g. 1200 sq.ft" data-testid="enquiry-space" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-slate-400" htmlFor="enq-date">Expected installation date (optional)</label>
                <input id="enq-date" type="date" className={`${inputCls} [color-scheme:dark]`} value={form.install_date} onChange={set("install_date")} data-testid="enquiry-date" />
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-1.5 block text-xs text-slate-400" htmlFor="enq-message">Message or requirement *</label>
              <textarea id="enq-message" required rows={4} className={`${inputCls} resize-none`} value={form.message} onChange={set("message")} placeholder="Tell us about your venue, audience and what you want to build…" data-testid="enquiry-message" />
            </div>

            <label className="mt-6 flex cursor-pointer items-start gap-3 text-xs text-slate-400" data-testid="enquiry-consent-label">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#00f0ff]"
                data-testid="enquiry-consent"
              />
              I agree to be contacted by Halucinate regarding my inquiry.
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#00f0ff] px-8 py-4 font-heading text-sm font-bold uppercase tracking-[0.15em] text-[#050811] transition-transform duration-200 hover:scale-[1.02] disabled:opacity-50 sm:w-auto"
              data-testid="enquiry-submit"
            >
              {submitting ? "Transmitting…" : "Submit Inquiry"}
              <Send className="h-4 w-4" />
            </button>
          </motion.form>
        )}
      </div>
    </section>
  );
}
