import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { LayoutGrid, LogOut, Mail, MessageCircle, MessageSquare, Pencil, Plus, Search, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import type { Inquiry, Product, SeoPublic } from "@/lib/data";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import ChatsTab from "@/pages/admin/ChatsTab";
import ProposalBanner from "@/pages/admin/ProposalBanner";
import WhatsAppTab from "@/pages/admin/WhatsAppTab";

type Tab = "products" | "inquiries" | "chats" | "whatsapp" | "seo";

const inputCls =
  "w-full rounded-lg border border-[#1e293b] bg-[#050811] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-colors focus:border-[#00f0ff]/60";

type ProductForm = {
  id?: string;
  name: string;
  tag: string;
  price_label: string;
  description: string;
  image_url: string;
  hashtagsText: string;
  sort_order: number;
};

const emptyForm: ProductForm = {
  name: "", tag: "", price_label: "", description: "", image_url: "", hashtagsText: "", sort_order: 10,
};

function ProductsTab() {
  const qc = useQueryClient();
  const productsQuery = useQuery({ queryKey: ["admin-products"], queryFn: () => apiGet<Product[]>("/products") });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [uploading, setUploading] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (f: ProductForm) => {
      const payload = {
        name: f.name, tag: f.tag, price_label: f.price_label, description: f.description,
        image_url: f.image_url, sort_order: Number(f.sort_order) || 0,
        hashtags: f.hashtagsText.split(",").map((h) => h.trim()).filter(Boolean).map((h) => (h.startsWith("#") ? h : `#${h}`)),
      };
      if (f.id) return apiPut(`/admin/products/${f.id}`, payload);
      return apiPost("/admin/products", payload);
    },
    onSuccess: () => {
      toast.success("Product saved");
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: () => toast.error("Save failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/products/${id}`),
    onSuccess: () => {
      toast.success("Product deleted");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: () => toast.error("Delete failed"),
  });

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("upload failed");
      const data = (await res.json()) as { url: string };
      setForm((f) => ({ ...f, image_url: data.url }));
      toast.success("Photo uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const openEdit = (p: Product) => {
    setForm({
      id: p.id, name: p.name, tag: p.tag, price_label: p.price_label,
      description: p.description, image_url: p.image_url,
      hashtagsText: p.hashtags.join(", "), sort_order: p.sort_order,
    });
    setDialogOpen(true);
  };

  const products = productsQuery.data ?? [];

  return (
    <div data-testid="admin-products-tab">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold text-white">Products ({products.length})</h2>
        <button
          onClick={() => { setForm(emptyForm); setDialogOpen(true); }}
          className="inline-flex items-center gap-2 rounded-full bg-[#00f0ff] px-4 py-2 font-heading text-xs font-bold uppercase tracking-[0.12em] text-[#050811] transition-transform duration-200 hover:scale-105"
          data-testid="add-product-button"
        >
          <Plus className="h-3.5 w-3.5" /> Add Product
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#1e293b]">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-[#1e293b] bg-[#070c18]">
              <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Photo</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Name</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Tag</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Price</th>
              <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Order</th>
              <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-[#1e293b]/60 transition-colors hover:bg-[#00f0ff]/5" data-testid={`admin-product-row-${p.id}`}>
                <td className="px-4 py-3">
                  <img src={p.image_url} alt={p.name} className="h-10 w-16 rounded-md border border-[#1e293b] object-cover" />
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-white">{p.name}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{p.tag}</td>
                <td className="px-4 py-3 text-xs text-[#00f0ff]">{p.price_label}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{p.sort_order}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(p)} className="rounded-lg border border-[#1e293b] p-2 text-slate-300 transition-colors hover:border-[#00f0ff]/50 hover:text-[#00f0ff]" aria-label={`Edit ${p.name}`} data-testid={`edit-product-${p.id}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => { if (window.confirm(`Delete "${p.name}"?`)) deleteMutation.mutate(p.id); }} className="rounded-lg border border-[#1e293b] p-2 text-slate-300 transition-colors hover:border-[#ff4466]/50 hover:text-[#ff4466]" aria-label={`Delete ${p.name}`} data-testid={`delete-product-${p.id}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-[#1e293b] bg-[#0b1120] text-white sm:max-w-lg" data-testid="product-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-white">{form.id ? "Edit Product" : "New Product"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }}
            className="space-y-4"
            data-testid="product-form"
          >
            <div>
              <label className="mb-1 block text-xs text-slate-400">Name *</label>
              <input required className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="product-form-name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Category tag</label>
                <input className={inputCls} value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="e.g. Most Selling" data-testid="product-form-tag" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Sort order</label>
                <input type="number" className={inputCls} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} data-testid="product-form-order" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Starting price label</label>
              <input className={inputCls} value={form.price_label} onChange={(e) => setForm({ ...form, price_label: e.target.value })} placeholder="e.g. ₹9,80,000" data-testid="product-form-price" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Description</label>
              <textarea rows={4} className={`${inputCls} resize-none`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="product-form-description" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Hashtags (comma separated)</label>
              <input className={inputCls} value={form.hashtagsText} onChange={(e) => setForm({ ...form, hashtagsText: e.target.value })} placeholder="#VRGaming, #EscapeRooms" data-testid="product-form-hashtags" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Photo</label>
              <div className="flex items-center gap-3">
                {form.image_url && <img src={form.image_url} alt="Product" className="h-14 w-24 rounded-lg border border-[#1e293b] object-cover" data-testid="product-form-image-preview" />}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#00f0ff]/40 px-4 py-2.5 text-xs font-semibold text-[#00f0ff] transition-colors hover:bg-[#00f0ff]/10" data-testid="product-form-upload">
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? "Uploading…" : "Upload photo"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
                </label>
              </div>
              <input className={`${inputCls} mt-2`} value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="or paste image URL" data-testid="product-form-image-url" />
            </div>
            <button
              type="submit"
              disabled={saveMutation.isPending || uploading}
              className="w-full rounded-full bg-[#00f0ff] py-3 font-heading text-sm font-bold uppercase tracking-[0.15em] text-[#050811] transition-transform duration-200 hover:scale-[1.02] disabled:opacity-50"
              data-testid="product-form-save"
            >
              {saveMutation.isPending ? "Saving…" : "Save Product"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const STAGES = [
  { id: "new", label: "New", badge: "border-[#00f0ff]/40 bg-[#00f0ff]/10 text-[#00f0ff]" },
  { id: "contacted", label: "Contacted", badge: "border-[#ffb800]/40 bg-[#ffb800]/10 text-[#ffb800]" },
  { id: "closed", label: "Closed", badge: "border-[#00ffa3]/40 bg-[#00ffa3]/10 text-[#00ffa3]" },
] as const;

function InquiriesTab() {
  const qc = useQueryClient();
  const inquiriesQuery = useQuery({ queryKey: ["admin-inquiries"], queryFn: () => apiGet<Inquiry[]>("/admin/enquiries") });
  const [filter, setFilter] = useState<string>("all");

  const stageMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiPut(`/admin/enquiries/${id}/status`, { status }),
    onSuccess: () => {
      toast.success("Stage updated");
      qc.invalidateQueries({ queryKey: ["admin-inquiries"] });
    },
    onError: () => toast.error("Could not update stage"),
  });

  const inquiries = inquiriesQuery.data ?? [];
  const stageOf = (s?: string) => STAGES.find((st) => st.id === s) ?? STAGES[0];
  const counts = STAGES.map((st) => ({ ...st, n: inquiries.filter((i) => (i.status || "new") === st.id).length }));
  const visible = filter === "all" ? inquiries : inquiries.filter((i) => (i.status || "new") === filter);

  return (
    <div data-testid="admin-inquiries-tab">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-heading text-lg font-bold text-white">Inquiries ({inquiries.length})</h2>
        <div className="flex flex-wrap gap-2" data-testid="inquiry-filters">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] transition-colors ${filter === "all" ? "border-[#00f0ff] bg-[#00f0ff] text-[#050811]" : "border-[#1e293b] text-slate-400 hover:border-[#00f0ff]/40 hover:text-[#00f0ff]"}`}
            data-testid="filter-all"
          >
            All · {inquiries.length}
          </button>
          {counts.map((st) => (
            <button
              key={st.id}
              onClick={() => setFilter(st.id)}
              className={`rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] transition-colors ${filter === st.id ? "border-[#00f0ff] bg-[#00f0ff] text-[#050811]" : "border-[#1e293b] text-slate-400 hover:border-[#00f0ff]/40 hover:text-[#00f0ff]"}`}
              data-testid={`filter-${st.id}`}
            >
              {st.label} · {st.n}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-[#1e293b] bg-[#0b1120] p-8 text-center text-sm text-slate-500" data-testid="inquiries-empty">
          {inquiries.length === 0
            ? "No inquiries yet. New website enquiries and Bruce chatbot leads will appear here."
            : "No inquiries in this stage."}
        </p>
      ) : (
        <div className="space-y-4">
          {visible.map((inq) => {
            const stage = stageOf(inq.status);
            return (
              <div key={inq.id} className="rounded-xl border border-[#1e293b] bg-[#0b1120] p-5" data-testid={`inquiry-card-${inq.id}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-heading text-sm font-bold text-white">{inq.name} <span className="ml-2 font-mono text-[10px] font-normal text-slate-500">{new Date(inq.created_at).toLocaleString()}</span></p>
                    <p className="mt-1 text-xs text-slate-400">{inq.email} · {inq.mobile}{inq.company ? ` · ${inq.company}` : ""}{inq.city ? ` · ${inq.city}${inq.state ? `, ${inq.state}` : ""}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {inq.budget && <span className="rounded-full border border-[#00f0ff]/30 px-3 py-1 font-mono text-[10px] text-[#00f0ff]">{inq.budget}</span>}
                    <span className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] ${stage.badge}`} data-testid={`inquiry-status-${inq.id}`}>
                      {stage.label}
                    </span>
                  </div>
                </div>
                {inq.products.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {inq.products.map((p) => (
                      <span key={p} className="rounded-full bg-[#002b3d] px-2.5 py-0.5 text-[10px] text-[#00f0ff]">{p}</span>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{inq.message}</p>
                {inq.chat_summary && (
                  <div className="mt-3 rounded-lg border border-[#7928ca]/40 bg-[#7928ca]/10 p-3" data-testid={`inquiry-summary-${inq.id}`}>
                    <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#c29bff]">Bruce AI deal summary</p>
                    <p className="whitespace-pre-line text-xs leading-relaxed text-slate-300">{inq.chat_summary}</p>
                  </div>
                )}
                {(inq.space || inq.install_date) && (
                  <p className="mt-2 font-mono text-[10px] text-slate-500">
                    {inq.space ? `Space: ${inq.space}` : ""}{inq.space && inq.install_date ? " · " : ""}{inq.install_date ? `Install: ${inq.install_date}` : ""}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2 border-t border-[#1e293b]/60 pt-3">
                  {STAGES.filter((st) => st.id !== stage.id).map((st) => (
                    <button
                      key={st.id}
                      onClick={() => stageMutation.mutate({ id: inq.id, status: st.id })}
                      disabled={stageMutation.isPending}
                      className="rounded-full border border-[#1e293b] px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-slate-400 transition-colors hover:border-[#00f0ff]/50 hover:text-[#00f0ff] disabled:opacity-40"
                      data-testid={`move-${st.id}-${inq.id}`}
                    >
                      → {st.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SeoTab() {
  const qc = useQueryClient();
  const seoQuery = useQuery({ queryKey: ["admin-seo"], queryFn: () => apiGet<SeoPublic & { id?: string }>("/admin/seo") });
  const [form, setForm] = useState<SeoPublic | null>(null);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [suggestions, setSuggestions] = useState<{ hashtags: string[]; keywords: string[]; competitors: string[]; raw: string } | null>(null);

  const data = form ?? seoQuery.data ?? null;

  const saveMutation = useMutation({
    mutationFn: (s: SeoPublic) => apiPut("/admin/seo", s),
    onSuccess: () => {
      toast.success("SEO settings saved");
      qc.invalidateQueries({ queryKey: ["admin-seo"] });
      qc.invalidateQueries({ queryKey: ["seo"] });
    },
    onError: () => toast.error("Save failed"),
  });

  const suggestMutation = useMutation({
    mutationFn: () => apiPost<{ hashtags: string[]; keywords: string[]; competitors: string[]; raw: string }>("/admin/seo/suggest", { location, notes }),
    onSuccess: (res) => setSuggestions(res),
    onError: () => toast.error("AI suggestion failed — try again"),
  });

  const addEverything = () => {
    if (!suggestions) return;
    const mergedTags = [...data!.hashtags];
    suggestions.hashtags.forEach((h) => {
      const t = h.startsWith("#") ? h : `#${h}`;
      if (!mergedTags.includes(t)) mergedTags.push(t);
    });
    const mergedComps = [...data!.competitors];
    suggestions.competitors.forEach((c) => {
      const clean = c.trim();
      if (clean && !mergedComps.includes(clean)) mergedComps.push(clean);
    });
    const next = { ...data!, hashtags: mergedTags, competitors: mergedComps };
    setForm(next);
    saveMutation.mutate(next);
    toast.success("All suggestions are live on your website");
  };

  if (!data) return <p className="text-sm text-slate-500">Loading SEO settings…</p>;

  const set = (patch: Partial<SeoPublic>) => setForm({ ...data, ...patch });
  const addHashtag = (h: string) => {
    const tag = h.startsWith("#") ? h : `#${h}`;
    if (!data.hashtags.includes(tag)) set({ hashtags: [...data.hashtags, tag] });
  };
  const addCompetitor = (c: string) => {
    if (c.trim() && !data.competitors.includes(c.trim())) set({ competitors: [...data.competitors, c.trim()] });
  };

  return (
    <div className="max-w-3xl" data-testid="admin-seo-tab">
      <h2 className="mb-2 font-heading text-lg font-bold text-white">SEO & AI Search Optimization</h2>
      <p className="mb-8 text-sm text-slate-500">
        Control how Halucinate appears on Google, ChatGPT, Claude, Perplexity and other AI answer engines. Hashtags render in the site footer; meta fields document your page strategy.
      </p>

      <div className="space-y-5 rounded-xl border border-[#1e293b] bg-[#0b1120] p-6">
        <div>
          <label className="mb-1 block text-xs text-slate-400">Meta title</label>
          <input className={inputCls} value={data.meta_title} onChange={(e) => set({ meta_title: e.target.value })} data-testid="seo-meta-title" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Meta description</label>
          <textarea rows={3} className={`${inputCls} resize-none`} value={data.meta_description} onChange={(e) => set({ meta_description: e.target.value })} data-testid="seo-meta-description" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Keywords (comma separated)</label>
          <input className={inputCls} value={data.keywords} onChange={(e) => set({ keywords: e.target.value })} data-testid="seo-keywords" />
        </div>

        <div>
          <label className="mb-2 block text-xs text-slate-400">Hashtags (shown on site, used for organic reach)</label>
          <div className="mb-3 flex flex-wrap gap-2" data-testid="seo-hashtag-list">
            {data.hashtags.map((h) => (
              <span key={h} className="group inline-flex items-center gap-1.5 rounded-full border border-[#00f0ff]/30 bg-[#002b3d]/50 px-3 py-1 font-mono text-[11px] text-[#00f0ff]">
                {h}
                <button onClick={() => set({ hashtags: data.hashtags.filter((x) => x !== h) })} className="text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-[#ff4466]" aria-label={`Remove ${h}`} data-testid={`seo-hashtag-remove-${h}`}>×</button>
              </span>
            ))}
          </div>
          <HashtagInput onAdd={addHashtag} />
        </div>

        <div>
          <label className="mb-2 block text-xs text-slate-400">Competitors to track</label>
          <div className="mb-3 flex flex-wrap gap-2" data-testid="seo-competitor-list">
            {data.competitors.map((c) => (
              <span key={c} className="group inline-flex items-center gap-1.5 rounded-full border border-[#ff2d78]/30 bg-[#ff2d78]/10 px-3 py-1 text-[11px] text-[#ff8fb0]">
                {c}
                <button onClick={() => set({ competitors: data.competitors.filter((x) => x !== c) })} className="text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-[#ff4466]" aria-label={`Remove ${c}`} data-testid={`seo-competitor-remove-${c}`}>×</button>
              </span>
            ))}
          </div>
          <CompetitorInput onAdd={addCompetitor} />
        </div>

        <button
          onClick={() => saveMutation.mutate(data)}
          disabled={saveMutation.isPending}
          className="rounded-full bg-[#00f0ff] px-6 py-2.5 font-heading text-xs font-bold uppercase tracking-[0.15em] text-[#050811] transition-transform duration-200 hover:scale-105 disabled:opacity-50"
          data-testid="seo-save-button"
        >
          {saveMutation.isPending ? "Saving…" : "Save SEO Settings"}
        </button>
      </div>

      <div className="mt-8 rounded-xl border border-[#7928ca]/40 bg-[#0b1120] p-6">
        <h3 className="flex items-center gap-2 font-heading text-sm font-bold text-white">
          <Sparkles className="h-4 w-4 text-[#7928ca]" /> AI Hashtag & Competitor Discovery
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Bruce's brain scans your live product catalogue and target market to suggest hashtags,
          AI-search keyword phrases and nearby competitor types to track. A scheduled scan also runs
          on the 1st of every month and applies fresh hashtags to the website automatically.
        </p>
        <ProposalBanner />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Target city / region (e.g. Bangalore)" data-testid="seo-suggest-location" />
          <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Extra context (optional)" data-testid="seo-suggest-notes" />
        </div>
        <button
          onClick={() => suggestMutation.mutate()}
          disabled={suggestMutation.isPending}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#7928ca] px-5 py-2.5 font-heading text-xs font-bold uppercase tracking-[0.15em] text-[#c29bff] transition-colors duration-200 hover:bg-[#7928ca]/20 disabled:opacity-50"
          data-testid="seo-suggest-button"
        >
          <Search className="h-3.5 w-3.5" />
          {suggestMutation.isPending ? "Scanning market…" : "Generate with AI"}
        </button>

        {suggestions && (
          <div className="mt-6 space-y-5" data-testid="seo-suggestions">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#00ffa3]/30 bg-[#00ffa3]/5 p-4">
              <p className="max-w-md text-xs leading-relaxed text-slate-300">
                Push every suggested hashtag and competitor straight onto your live website in one click.
              </p>
              <button
                onClick={addEverything}
                disabled={saveMutation.isPending}
                className="rounded-full bg-[#00ffa3] px-5 py-2.5 font-heading text-xs font-bold uppercase tracking-[0.15em] text-[#050811] transition-transform duration-200 hover:scale-105 disabled:opacity-50"
                data-testid="seo-add-everything"
              >
                {saveMutation.isPending ? "Applying…" : "Add Everything to Website"}
              </button>
            </div>
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Suggested hashtags — click to add</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.hashtags.map((h) => (
                  <button key={h} onClick={() => addHashtag(h)} className="rounded-full border border-[#1e293b] px-3 py-1 font-mono text-[11px] text-slate-300 transition-colors hover:border-[#00f0ff]/60 hover:text-[#00f0ff]" data-testid={`suggested-hashtag-${h}`}>
                    {h}
                  </button>
                ))}
              </div>
            </div>
            {suggestions.keywords.length > 0 && (
              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">AI search phrases customers type</p>
                <ul className="space-y-1">
                  {suggestions.keywords.map((k) => (
                    <li key={k} className="text-xs text-slate-400">· {k}</li>
                  ))}
                </ul>
              </div>
            )}
            {suggestions.competitors.length > 0 && (
              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Competitors to track — click to add</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.competitors.map((c) => (
                    <button key={c} onClick={() => addCompetitor(c)} className="rounded-full border border-[#1e293b] px-3 py-1 text-[11px] text-slate-300 transition-colors hover:border-[#ff2d78]/60 hover:text-[#ff8fb0]" data-testid={`suggested-competitor-${c}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function HashtagInput({ onAdd }: { onAdd: (h: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="flex gap-2">
      <input className={inputCls} value={value} onChange={(e) => setValue(e.target.value)} placeholder="#NewHashtag" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (value.trim()) { onAdd(value.trim()); setValue(""); } } }} data-testid="seo-hashtag-input" />
      <button onClick={() => { if (value.trim()) { onAdd(value.trim()); setValue(""); } }} className="rounded-lg border border-[#00f0ff]/40 px-4 text-xs font-bold text-[#00f0ff] transition-colors hover:bg-[#00f0ff]/10" data-testid="seo-hashtag-add">
        Add
      </button>
    </div>
  );
}

function CompetitorInput({ onAdd }: { onAdd: (c: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="flex gap-2">
      <input className={inputCls} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Competitor name" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(value); setValue(""); } }} data-testid="seo-competitor-input" />
      <button onClick={() => { onAdd(value); setValue(""); }} className="rounded-lg border border-[#ff2d78]/40 px-4 text-xs font-bold text-[#ff8fb0] transition-colors hover:bg-[#ff2d78]/10" data-testid="seo-competitor-add">
        Add
      </button>
    </div>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("products");
  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => apiGet<{ email: string }>("/auth/me"), retry: false });

  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050811]" data-testid="admin-loading">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1e293b] border-t-[#00f0ff]" />
      </div>
    );
  }

  if (meQuery.isError) return <Navigate to="/admin/login" replace />;

  const logout = async () => {
    await apiPost("/auth/logout");
    navigate("/admin/login");
  };

  const TABS: { id: Tab; label: string; icon: typeof LayoutGrid }[] = [
    { id: "products", label: "Products", icon: LayoutGrid },
    { id: "inquiries", label: "Inquiries", icon: Mail },
    { id: "chats", label: "Bruce Chats", icon: MessageSquare },
    { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
    { id: "seo", label: "SEO & AI Search", icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-[#050811] text-white" data-testid="admin-dashboard">
      <header className="sticky top-0 z-30 border-b border-[#1e293b] bg-[#070c18]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-4">
            <img src="/assets/brand/halucinate-white.png" alt="Halucinate" className="h-6 w-auto mix-blend-screen" />
            <span className="rounded-full border border-[#00f0ff]/30 bg-[#002b3d]/40 px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#00f0ff]">Console</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden font-mono text-[11px] text-slate-500 sm:block" data-testid="admin-user-email">{meQuery.data?.email}</span>
            <a href="/" className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400 transition-colors hover:text-[#00f0ff]" data-testid="admin-view-site">View site</a>
            <button onClick={logout} className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400 transition-colors hover:text-[#ff4466]" data-testid="admin-logout">
              <LogOut className="h-3.5 w-3.5" /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 flex flex-wrap gap-2"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 font-heading text-xs font-bold uppercase tracking-[0.12em] transition-colors duration-200 ${
                tab === t.id
                  ? "border-[#00f0ff] bg-[#00f0ff] text-[#050811]"
                  : "border-[#1e293b] text-slate-400 hover:border-[#00f0ff]/40 hover:text-[#00f0ff]"
              }`}
              data-testid={`admin-tab-${t.id}`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </motion.div>

        {tab === "products" && <ProductsTab />}
        {tab === "inquiries" && <InquiriesTab />}
        {tab === "chats" && <ChatsTab />}
        {tab === "whatsapp" && <WhatsAppTab />}
        {tab === "seo" && <SeoTab />}
      </div>
    </div>
  );
}
