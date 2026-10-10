import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Send, X } from "lucide-react";

type Msg = { role: "customer" | "bruce"; text: string };

const GREETING = "Need any help? I can answer anything about our products. Just ask the question — I'm ready to help you.";

export default function Bruce() {
  const [open, setOpen] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "bruce", text: "Hey, I'm Bruce — Halucinate's AI guide. Ask me anything about our VR attractions, pricing or installations." },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const sessionId = useRef(crypto.randomUUID());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setShowGreeting(true), 2500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const appendToken = (token: string) => {
    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last && last.role === "bruce") copy[copy.length - 1] = { ...last, text: last.text + token };
      return copy;
    });
  };

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "customer", text }, { role: "bruce", text: "" }]);
    setStreaming(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId.current, message: text }),
      });
      if (!res.ok || !res.body) throw new Error("chat failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          try {
            const payload = JSON.parse(line.slice(5).trim());
            if (payload.t) appendToken(payload.t);
          } catch { /* partial chunk */ }
        }
      }
    } catch {
      appendToken("Sorry, I had a glitch connecting to my brain. Please try again in a moment.");
    } finally {
      setStreaming(false);
    }
  };

  return (
    <>
      {/* greeting bubble */}
      <AnimatePresence>
        {showGreeting && !open && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-28 right-24 z-50 hidden max-w-[240px] rounded-2xl rounded-br-sm border border-[#00f0ff]/40 bg-[#0b1120]/95 p-4 shadow-[0_0_30px_rgba(0,240,255,0.25)] backdrop-blur-xl sm:block"
            data-testid="bruce-greeting"
          >
            <button
              onClick={() => setShowGreeting(false)}
              className="absolute -left-2 -top-2 rounded-full border border-[#1e293b] bg-[#050811] p-1 text-slate-400 hover:text-white"
              aria-label="Dismiss"
              data-testid="bruce-greeting-close"
            >
              <X className="h-3 w-3" />
            </button>
            <p className="text-xs leading-relaxed text-slate-200">{GREETING}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-24 right-4 z-50 flex h-[540px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-[#00f0ff]/35 bg-[#070c18]/95 shadow-[0_0_60px_rgba(0,240,255,0.2)] backdrop-blur-2xl sm:right-6"
            data-testid="bruce-panel"
          >
            <div className="flex items-center gap-3 border-b border-[#00f0ff]/20 bg-[#050811]/80 px-4 py-3">
              <div className="relative">
                <img src="/assets/brand/bruce.jpg" alt="Bruce, Halucinate AI assistant" className="h-10 w-10 rounded-full border border-[#00f0ff]/50 object-cover" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#050811] bg-[#00ffa3]" />
              </div>
              <div className="flex-1">
                <p className="font-heading text-sm font-bold text-white">Bruce</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#00f0ff]/80">Halucinate AI · Online</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-full p-1.5 text-slate-400 transition-colors hover:text-white" aria-label="Close chat" data-testid="bruce-close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" data-testid="bruce-messages">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "customer" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      m.role === "customer"
                        ? "rounded-br-sm bg-[#00f0ff] text-[#050811]"
                        : "rounded-bl-sm border border-[#1e293b] bg-[#0b1120] text-slate-200"
                    }`}
                  >
                    {m.text || (m.role === "bruce" && streaming && i === messages.length - 1 ? (
                      <span className="inline-flex gap-1 py-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#00f0ff]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#00f0ff] [animation-delay:0.15s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#00f0ff] [animation-delay:0.3s]" />
                      </span>
                    ) : null)}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[#00f0ff]/20 bg-[#050811]/80 p-3">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Ask about products, pricing, space…"
                  className="flex-1 rounded-full border border-[#1e293b] bg-[#0b1120] px-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-colors focus:border-[#00f0ff]/60"
                  data-testid="bruce-input"
                />
                <button
                  onClick={send}
                  disabled={streaming || !input.trim()}
                  className="rounded-full bg-[#00f0ff] p-2.5 text-[#050811] transition-transform duration-200 hover:scale-105 disabled:opacity-40"
                  aria-label="Send message"
                  data-testid="bruce-send"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.2em] text-slate-600">
                Answers from Halucinate's live product data
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* launcher — Bruce knocks on the screen */}
      <motion.button
        onClick={() => { setOpen((o) => !o); setShowGreeting(false); }}
        className="fixed bottom-5 right-5 z-50 h-16 w-16 overflow-hidden rounded-full border-2 border-[#00f0ff]/70 shadow-[0_0_30px_rgba(0,240,255,0.45)]"
        animate={open ? { rotate: 0, x: 0 } : { rotate: [0, -14, 4, -10, 0], x: [0, -4, 1, -3, 0] }}
        transition={open ? { duration: 0.3 } : { duration: 1.1, repeat: Infinity, repeatDelay: 2.6, ease: "easeInOut" }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        aria-label="Chat with Bruce"
        data-testid="bruce-launcher"
      >
        <img src="/assets/brand/bruce.jpg" alt="Bruce" className="h-full w-full object-cover" />
      </motion.button>
    </>
  );
}
