import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { apiGet } from "@/lib/api";
import { FALLBACK_PRODUCTS, productPath, slugify, type Product, type SeoPublic } from "@/lib/data";
import { isCanonical, setHead } from "@/lib/head";
import { scrollToId } from "@/lib/scroll";
import Faq from "@/components/landing/Faq";
import EnquiryForm from "@/components/landing/EnquiryForm";
import Footer from "@/components/landing/Footer";
import Bruce from "@/components/chat/Bruce";

const INCLUDED = [
  "Hardware and software, delivered as one turnkey system",
  "Networking, installation and calibration at your venue",
  "Operator training for your team",
  "Technical support after installation",
  "Themes, content and branding customised to your space and budget",
];

function summary(text: string, limit = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  return clean.slice(0, clean.lastIndexOf(" ", limit)).replace(/[,.;:]$/, "") + "…";
}

export default function ProductPage() {
  const { slug = "" } = useParams();
  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: () => apiGet<Product[]>("/products"),
    staleTime: 60_000,
    retry: 1,
  });
  const seoQuery = useQuery({
    queryKey: ["seo"],
    queryFn: () => apiGet<SeoPublic>("/seo"),
    staleTime: 60_000,
    retry: 1,
  });

  const products =
    !productsQuery.isError && productsQuery.data && productsQuery.data.length > 0
      ? productsQuery.data
      : FALLBACK_PRODUCTS;
  const product = products.find((p) => slugify(p.name) === slug);
  const loading = productsQuery.isLoading && !product;
  const others = products.filter((p) => p.id !== product?.id);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  // After an in-app navigation the head still describes the previous page.
  // On a direct load the server already wrote this product's tags; leave them.
  useEffect(() => {
    if (!product) return;
    const path = productPath(product);
    if (isCanonical(path)) return;
    setHead({
      path,
      title: `${product.name} in India — Price & Installation | Halucinate`,
      description: summary(product.description),
    });
  }, [product]);

  // Preselect this product in the enquiry form once it has mounted.
  useEffect(() => {
    if (!product) return;
    const t = setTimeout(
      () => window.dispatchEvent(new CustomEvent("hlc:add-product", { detail: product.name })),
      0,
    );
    return () => clearTimeout(t);
  }, [product]);

  return (
    <div className="min-h-screen bg-[#050811] text-[#f0f6fc]" data-testid="product-page">
      <header className="sticky top-0 z-40 border-b border-[#00f0ff]/15 bg-[#050811]/85 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link to="/" aria-label="Halucinate home" data-testid="product-nav-logo">
            <img src="/assets/brand/halucinate-white.png" alt="Halucinate" className="h-7 w-auto mix-blend-screen" />
          </Link>
          <div className="flex items-center gap-5">
            <Link
              to="/#products"
              className="hidden font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400 transition-colors duration-200 hover:text-[#00f0ff] sm:block"
            >
              All products
            </Link>
            <button
              onClick={() => scrollToId("enquiry")}
              className="rounded-full bg-[#00f0ff] px-5 py-2 font-heading text-xs font-bold uppercase tracking-[0.15em] text-[#050811] transition-transform duration-200 hover:scale-105"
              data-testid="product-cta-button"
            >
              Request Pricing
            </button>
          </div>
        </div>
      </header>

      <main>
        {loading ? (
          <div className="mx-auto max-w-5xl px-5 py-32 lg:px-8" aria-busy="true" />
        ) : !product ? (
          <section className="mx-auto max-w-3xl px-5 py-32 text-center lg:px-8" data-testid="product-not-found">
            <h1 className="font-heading text-3xl font-extrabold text-white">Page not found</h1>
            <p className="mt-4 text-slate-400">That page does not exist. Here is the full catalogue:</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {products.map((p) => (
                <Link
                  key={p.id}
                  to={productPath(p)}
                  className="rounded-full border border-[#1e293b] px-4 py-2 text-sm text-slate-300 transition-colors duration-200 hover:border-[#00f0ff]/50 hover:text-[#00f0ff]"
                >
                  {p.name}
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <>
            <article className="mx-auto max-w-5xl px-5 pb-20 pt-10 lg:px-8 lg:pt-14">
              <nav aria-label="Breadcrumb" className="mb-8 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
                <Link to="/" className="inline-flex items-center gap-1.5 transition-colors duration-200 hover:text-[#00f0ff]">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Halucinate
                </Link>
                <span className="mx-2">/</span>
                <Link to="/#products" className="transition-colors duration-200 hover:text-[#00f0ff]">
                  Products
                </Link>
                <span className="mx-2">/</span>
                <span className="text-slate-300">{product.name}</span>
              </nav>

              {product.tag && (
                <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-[#00f0ff]">{product.tag}</p>
              )}
              <h1 className="font-heading text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                {product.name}
              </h1>

              <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Starting price</p>
                  <p className="font-heading text-2xl font-bold text-[#00f0ff]">{product.price_label || "On request"}</p>
                </div>
                <button
                  onClick={() => scrollToId("enquiry")}
                  className="rounded-full border border-[#00f0ff]/40 px-6 py-3 font-heading text-xs font-bold uppercase tracking-[0.12em] text-[#00f0ff] transition-colors duration-200 hover:bg-[#00f0ff] hover:text-[#050811]"
                  data-testid="product-enquire-button"
                >
                  Get a quotation
                </button>
              </div>

              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={`${product.name} by Halucinate`}
                  className="mt-10 aspect-[16/9] w-full rounded-2xl border border-[#1e293b] object-cover"
                />
              )}

              <div className="mt-10 grid gap-12 lg:grid-cols-[1.6fr_1fr]">
                <div>
                  <h2 className="font-heading text-xl font-bold text-white">About {product.name}</h2>
                  <p className="mt-4 text-base leading-relaxed text-slate-300">{product.description}</p>
                  {product.hashtags.length > 0 && (
                    <p className="mt-6 font-mono text-[11px] tracking-wide text-[#00f0ff]/60">
                      {product.hashtags.join(" ")}
                    </p>
                  )}
                </div>
                <aside className="h-fit rounded-2xl border border-[#1e293b] bg-[#0b1120] p-6">
                  <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-white">What is included</h2>
                  <ul className="mt-4 space-y-3">
                    {INCLUDED.map((line) => (
                      <li key={line} className="flex gap-3 text-sm leading-relaxed text-slate-400">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#00f0ff]" />
                        {line}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-5 text-xs leading-relaxed text-slate-500">
                    Prices are indicative starting prices. GST is charged additionally wherever applicable.
                  </p>
                </aside>
              </div>
            </article>

            <section className="border-t border-[#1e293b]">
              <div className="mx-auto max-w-5xl px-5 py-16 lg:px-8">
                <h2 className="font-heading text-xl font-bold text-white">More Halucinate attractions</h2>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {others.map((p) => (
                    <Link
                      key={p.id}
                      to={productPath(p)}
                      className="rounded-xl border border-[#1e293b] bg-[#0b1120] p-4 transition-colors duration-200 hover:border-[#00f0ff]/50"
                      data-testid={`related-product-${p.id}`}
                    >
                      <span className="block font-heading text-sm font-bold text-white">{p.name}</span>
                      <span className="mt-1 block font-mono text-[11px] text-[#00f0ff]/70">
                        {p.price_label || "On request"}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </section>

            <Faq />
            <EnquiryForm products={products} />
          </>
        )}
      </main>

      <Footer seo={seoQuery.isError ? null : seoQuery.data ?? null} products={products} />
      <Bruce />
    </div>
  );
}
