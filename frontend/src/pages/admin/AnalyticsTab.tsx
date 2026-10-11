import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { BarChart3, Mail, MessageSquare, Target } from "lucide-react";
import { apiGet } from "@/lib/api";

type Stats = {
  enquiries_total: number;
  enquiries_week: number;
  chats_total: number;
  chats_week: number;
  leads_total: number;
  pipeline: { new: number; contacted: number; closed: number };
  weekly_enquiries: { week: string; count: number }[];
  weekly_chats: { week: string; count: number }[];
};

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function weekLabel(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function AnalyticsTab() {
  const statsQuery = useQuery({ queryKey: ["admin-stats"], queryFn: () => apiGet<Stats>("/admin/stats") });
  const s = statsQuery.data;

  if (!s) return <p className="text-sm text-slate-500">Loading analytics…</p>;

  const maxWeekly = Math.max(1, ...s.weekly_enquiries.map((w) => w.count), ...s.weekly_chats.map((w) => w.count));
  const pipelineTotal = Math.max(1, s.pipeline.new + s.pipeline.contacted + s.pipeline.closed);

  const tiles = [
    { label: "Total enquiries", value: s.enquiries_total, sub: `+${s.enquiries_week} this week`, icon: Mail, color: "text-[#00f0ff]", testid: "tile-enquiries" },
    { label: "Bruce chats", value: s.chats_total, sub: `+${s.chats_week} this week`, icon: MessageSquare, color: "text-[#7928ca]", testid: "tile-chats" },
    { label: "Bruce leads", value: s.leads_total, sub: "name + email captured", icon: Target, color: "text-[#00ffa3]", testid: "tile-leads" },
    { label: "Open pipeline", value: s.pipeline.new, sub: `${s.pipeline.contacted} contacted · ${s.pipeline.closed} closed`, icon: BarChart3, color: "text-[#ffb800]", testid: "tile-pipeline" },
  ];

  return (
    <div data-testid="admin-analytics-tab">
      <h2 className="mb-6 font-heading text-lg font-bold text-white">Visitor Analytics</h2>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t, i) => (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: i * 0.07 }}
            className="rounded-xl border border-[#1e293b] bg-[#0b1120] p-5"
            data-testid={t.testid}
          >
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{t.label}</p>
              <t.icon className={`h-4 w-4 ${t.color}`} />
            </div>
            <p className="mt-3 font-heading text-3xl font-black text-white">{t.value}</p>
            <p className="mt-1 text-[11px] text-slate-500">{t.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="rounded-xl border border-[#1e293b] bg-[#0b1120] p-6" data-testid="weekly-chart">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">Last 8 weeks</p>
          <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.15em]">
            <span className="flex items-center gap-1.5 text-slate-400"><span className="h-2 w-2 rounded-sm bg-[#00f0ff]" /> Enquiries</span>
            <span className="flex items-center gap-1.5 text-slate-400"><span className="h-2 w-2 rounded-sm bg-[#7928ca]" /> Bruce chats</span>
          </div>
        </div>
        <div className="flex h-44 items-end gap-3 sm:gap-5">
          {s.weekly_enquiries.map((w, i) => {
            const chats = s.weekly_chats[i]?.count ?? 0;
            return (
              <div key={w.week} className="flex flex-1 flex-col items-center gap-2" data-testid={`week-${w.week}`}>
                <div className="flex h-32 w-full items-end justify-center gap-1.5">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(w.count / maxWeekly) * 100}%` }}
                    transition={{ duration: 0.7, ease: EASE, delay: i * 0.05 }}
                    className="w-4 min-h-[3px] rounded-t bg-[#00f0ff] shadow-[0_0_12px_rgba(0,240,255,0.35)]"
                    title={`${w.count} enquiries`}
                  />
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(chats / maxWeekly) * 100}%` }}
                    transition={{ duration: 0.7, ease: EASE, delay: i * 0.05 + 0.06 }}
                    className="w-4 min-h-[3px] rounded-t bg-[#7928ca] shadow-[0_0_12px_rgba(121,40,202,0.35)]"
                    title={`${chats} chats`}
                  />
                </div>
                <p className="font-mono text-[9px] uppercase tracking-wide text-slate-500">{weekLabel(w.week)}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-[#1e293b] bg-[#0b1120] p-6" data-testid="pipeline-bar">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">Pipeline</p>
        <div className="flex h-3 overflow-hidden rounded-full bg-[#050811]">
          <div className="bg-[#00f0ff]" style={{ width: `${(s.pipeline.new / pipelineTotal) * 100}%` }} />
          <div className="bg-[#ffb800]" style={{ width: `${(s.pipeline.contacted / pipelineTotal) * 100}%` }} />
          <div className="bg-[#00ffa3]" style={{ width: `${(s.pipeline.closed / pipelineTotal) * 100}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#00f0ff]" /> New · {s.pipeline.new}</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#ffb800]" /> Contacted · {s.pipeline.contacted}</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#00ffa3]" /> Closed · {s.pipeline.closed}</span>
        </div>
      </div>
    </div>
  );
}
