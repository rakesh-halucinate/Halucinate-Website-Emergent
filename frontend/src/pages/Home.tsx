import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { FALLBACK_PRODUCTS, type Product, type SeoPublic } from "@/lib/data";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Marquee from "@/components/landing/Marquee";
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

  return (
    <div className="min-h-screen bg-[#050811] text-[#f0f6fc]" data-testid="home-page">
      <Navbar />
      <Hero />
      <Marquee />
      <Products products={products} />
      <PricingTable products={products} />
      <ImmersiveSection />
      <Faq />
      <EnquiryForm products={products} />
      <Footer seo={seo} />
      <Bruce />
    </div>
  );
}
