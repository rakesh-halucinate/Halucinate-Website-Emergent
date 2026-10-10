import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { apiGet } from "@/lib/api";
import { FALLBACK_PRODUCTS, type Product, type SeoPublic } from "@/lib/data";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Marquee from "@/components/landing/Marquee";
import PortalBand from "@/components/landing/PortalBand";
import DomeBand from "@/components/landing/DomeBand";
import Products from "@/components/landing/Products";
import PricingTable from "@/components/landing/PricingTable";
import ImmersiveSection from "@/components/landing/ImmersiveSection";
import Faq from "@/components/landing/Faq";
import EnquiryForm from "@/components/landing/EnquiryForm";
import Footer from "@/components/landing/Footer";
import Bruce from "@/components/chat/Bruce";

export default function Home() {
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
  const seo = seoQuery.isError ? null : seoQuery.data ?? null;

  // Admin-saved SEO meta goes live on the page title + meta tags
  useEffect(() => {
    if (!seo) return;
    if (seo.meta_title) document.title = seo.meta_title;
    const desc = document.querySelector('meta[name="description"]');
    if (desc && seo.meta_description) desc.setAttribute("content", seo.meta_description);
    const kw = document.querySelector('meta[name="keywords"]');
    if (kw && seo.keywords) kw.setAttribute("content", seo.keywords);
  }, [seo]);

  return (
    <div className="min-h-screen bg-[#050811] text-[#f0f6fc]" data-testid="home-page">
      <Navbar />
      <Hero />
      <Marquee />
      <PortalBand />
      <Products products={products} />
      <PricingTable products={products} />
      <ImmersiveSection />
      <DomeBand />
      <Faq />
      <EnquiryForm products={products} />
      <Footer seo={seo} />
      <Bruce />
    </div>
  );
}
