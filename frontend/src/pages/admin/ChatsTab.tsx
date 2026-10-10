import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, User } from "lucide-react";
import { apiGet } from "@/lib/api";

type ChatSummary = {
  id: string;
  created_at?: string;
  message_count: number;
  preview: string;
  lead?: { name: string; email: string } | null;
  summary?: string;
};

type ChatMsg = { role: string; content: string; ts?: string };

type ChatDetail = {
  id: string;
  created_at?: string;
  messages: ChatMsg[];
  lead?: { name: string; email: string } | null;
  summary?: string;
};

function ChatCard({ chat }: { chat: ChatSummary }) {
  const [expanded, setExpanded] = useState(false);
  const detailQuery = useQuery({
    queryKey: ["admin-chat", chat.id],
    queryFn: () => apiGet<ChatDetail>(`/admin/chats/${chat.id}`),
    enabled: expanded,
  });

  return (
    <div className="overflow-hidden rounded-xl border border-[#1e293b] bg-[#0b1120]" data-testid={`chat-card-${chat.id}`}>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-start justify-between gap-4 p-5 text-left transition-colors hover:bg-[#00f0ff]/5"
        data-testid={`chat-expand-${chat.id}`}
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
              {chat.created_at ? new Date(chat.created_at).toLocaleString() : "—"}
            </span>
            <span className="rounded-full border border-[#1e293b] px-2.5 py-0.5 font-mono text-[10px] text-slate-400">
              {chat.message_count} messages
            </span>
            {chat.lead && (
              <span className="rounded-full border border-[#00ffa3]/40 bg-[#00ffa3]/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-[#00ffa3]" data-testid={`chat-lead-badge-${chat.id}`}>
                Lead: {chat.lead.name}
              </span>
            )}
          </div>
          <p className="mt-2 truncate text-sm text-slate-300">
            {chat.preview || "(no customer message)"}
          </p>
        </div>
        <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-[#00f0ff] transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="border-t border-[#1e293b]/60 bg-[#050811]/60 p-5">
          {chat.summary && (
            <div className="mb-4 rounded-lg border border-[#7928ca]/40 bg-[#7928ca]/10 p-4" data-testid={`chat-summary-${chat.id}`}>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#c29bff]">AI deal summary</p>
              <p className="whitespace-pre-line text-xs leading-relaxed text-slate-300">{chat.summary}</p>
            </div>
          )}
          {chat.lead && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-[#00ffa3]/30 bg-[#00ffa3]/5 p-3 text-xs text-slate-300">
              <User className="h-3.5 w-3.5 text-[#00ffa3]" />
              <span className="font-semibold text-white">{chat.lead.name}</span>
              <span className="text-slate-400">{chat.lead.email}</span>
            </div>
          )}
          {detailQuery.isLoading ? (
            <p className="text-xs text-slate-500">Loading conversation…</p>
          ) : (
            <div className="max-h-96 space-y-2.5 overflow-y-auto pr-1" data-testid={`chat-thread-${chat.id}`}>
              {(detailQuery.data?.messages ?? []).map((m, i) => (
                <div key={i} className={`flex ${m.role === "customer" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                      m.role === "customer"
                        ? "rounded-br-sm bg-[#00f0ff]/15 text-[#bffbff]"
                        : "rounded-bl-sm border border-[#1e293b] bg-[#0b1120] text-slate-300"
                    }`}
                  >
                    <span className="mb-0.5 block font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
                      {m.role === "customer" ? "Customer" : "Bruce"}
                    </span>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ChatsTab() {
  const chatsQuery = useQuery({ queryKey: ["admin-chats"], queryFn: () => apiGet<ChatSummary[]>("/admin/chats") });
  const chats = chatsQuery.data ?? [];

  return (
    <div data-testid="admin-chats-tab">
      <h2 className="mb-2 font-heading text-lg font-bold text-white">Bruce Conversations ({chats.length})</h2>
      <p className="mb-6 text-sm text-slate-500">
        Every chat visitors have with Bruce. Cards marked "Lead" captured a name and email for a quotation.
      </p>
      {chats.length === 0 ? (
        <p className="rounded-xl border border-[#1e293b] bg-[#0b1120] p-8 text-center text-sm text-slate-500" data-testid="chats-empty">
          No conversations yet. Once visitors start chatting with Bruce, threads appear here.
        </p>
      ) : (
        <div className="space-y-4">
          {chats.map((c) => (
            <ChatCard key={c.id} chat={c} />
          ))}
        </div>
      )}
    </div>
  );
}
