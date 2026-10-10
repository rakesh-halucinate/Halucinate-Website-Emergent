import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { apiGet } from "@/lib/api";

type Proposal = {
  id: string;
  created_at?: string;
  applied?: boolean;
  new_hashtags?: string[];
  new_competitors?: string[];
  hashtags: string[];
  keywords: string[];
  competitors: string[];
  raw: string;
};

export default function ProposalBanner() {
  const proposalQuery = useQuery({
    queryKey: ["seo-proposal"],
    queryFn: () => apiGet<Proposal>("/admin/seo/proposals/latest"),
    retry: false,
  });

  const proposal = proposalQuery.data;
  if (!proposal) return null;

  const added = proposal.new_hashtags?.length ?? 0;
  const comps = proposal.new_competitors?.length ?? 0;

  return (
    <div
      className="mt-4 rounded-lg border border-[#00ffa3]/30 bg-[#00ffa3]/5 p-4"
      data-testid="seo-proposal-banner"
    >
      <p className="flex items-center gap-2 text-xs leading-relaxed text-slate-300">
        <RefreshCw className="h-3.5 w-3.5 shrink-0 text-[#00ffa3]" />
        Last monthly AI scan:{" "}
        {proposal.created_at ? new Date(proposal.created_at).toLocaleString() : "—"}
        {proposal.applied
          ? ` — applied automatically (+${added} hashtags, +${comps} competitors).`
          : " — pending review."}
      </p>
      {proposal.applied && (proposal.new_hashtags?.length ?? 0) > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {proposal.new_hashtags!.slice(0, 10).map((h) => (
            <span key={h} className="rounded-full border border-[#00ffa3]/30 px-2.5 py-0.5 font-mono text-[10px] text-[#00ffa3]">
              {h}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
