import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, MessageCircle, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/lib/api";

type WaStatus = { connected: boolean; user?: string | null; needs_scan?: boolean; error?: string };

export default function WhatsAppTab() {
  const qc = useQueryClient();
  const [sending, setSending] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = async () => {
    if (!window.confirm("Unlink WhatsApp? Enquiry alerts will stop until you scan a fresh QR code.")) return;
    setLoggingOut(true);
    try {
      await apiPost("/admin/whatsapp/logout");
      toast.success("WhatsApp unlinked — scan the new QR to reconnect");
      qc.invalidateQueries({ queryKey: ["wa-status"] });
      qc.invalidateQueries({ queryKey: ["wa-qr"] });
    } catch {
      toast.error("Logout failed — try again");
    } finally {
      setLoggingOut(false);
    }
  };

  const statusQuery = useQuery({
    queryKey: ["wa-status"],
    queryFn: () => apiGet<WaStatus>("/admin/whatsapp/status"),
    refetchInterval: 5000,
    retry: false,
  });
  const qrQuery = useQuery({
    queryKey: ["wa-qr"],
    queryFn: () => apiGet<{ qr: string | null }>("/admin/whatsapp/qr"),
    refetchInterval: 4000,
    enabled: !!statusQuery.data && !statusQuery.data.connected,
    retry: false,
  });

  const status = statusQuery.data;
  const connected = !!status?.connected;

  const sendTest = async () => {
    setSending(true);
    try {
      await apiPost("/admin/whatsapp/test");
      toast.success("Test alert sent to both WhatsApp numbers");
    } catch {
      toast.error("Could not send — is WhatsApp linked?");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-xl" data-testid="admin-whatsapp-tab">
      <h2 className="mb-2 font-heading text-lg font-bold text-white">WhatsApp Enquiry Alerts</h2>
      <p className="mb-8 text-sm text-slate-500">
        Every new enquiry is delivered to WhatsApp (+91 96321 21215 and +91 98803 68600) in addition
        to Telegram and email. Link any WhatsApp account once by scanning the QR — it becomes the sender.
      </p>

      <div className="rounded-xl border border-[#1e293b] bg-[#0b1120] p-6">
        <div className="mb-5 flex items-center gap-3" data-testid="wa-status">
          <span className={`h-3 w-3 rounded-full ${connected ? "bg-[#00ffa3] shadow-[0_0_12px_rgba(0,255,163,0.7)]" : "bg-[#ffb800] shadow-[0_0_12px_rgba(255,184,0,0.6)]"}`} />
          <p className="font-heading text-sm font-bold text-white">
            {connected ? "Connected" : "Waiting for QR scan"}
          </p>
          {connected && status?.user && (
            <span className="font-mono text-[10px] text-slate-500">linked: {status.user.split(":")[0]}</span>
          )}
        </div>

        {!connected && (
          <div className="rounded-lg border border-[#00f0ff]/25 bg-[#050811] p-5 text-center" data-testid="wa-qr-panel">
            {qrQuery.data?.qr ? (
              <>
                <img src={qrQuery.data.qr} alt="WhatsApp linking QR code" className="mx-auto rounded-lg bg-white p-2" data-testid="wa-qr-image" />
                <p className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <RefreshCw className="h-3 w-3 animate-spin text-[#00f0ff]" />
                  QR refreshes automatically — scan soon after it appears
                </p>
              </>
            ) : (
              <p className="py-10 text-sm text-slate-500">
                <RefreshCw className="mx-auto mb-3 h-5 w-5 animate-spin text-[#00f0ff]" />
                Generating QR code…
              </p>
            )}
            <ol className="mx-auto mt-5 max-w-xs space-y-1.5 text-left text-xs leading-relaxed text-slate-400">
              <li>1. Open WhatsApp on your phone</li>
              <li>2. Settings → Linked Devices → Link a Device</li>
              <li>3. Scan this code — alerts start instantly</li>
            </ol>
          </div>
        )}

        {connected && (
          <div className="rounded-lg border border-[#00ffa3]/25 bg-[#00ffa3]/5 p-5" data-testid="wa-connected-panel">
            <p className="flex items-center gap-2 text-sm text-slate-300">
              <MessageCircle className="h-4 w-4 text-[#00ffa3]" />
              Enquiry alerts are live on WhatsApp.
            </p>
            <button
              onClick={sendTest}
              disabled={sending}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#00ffa3] px-5 py-2.5 font-heading text-xs font-bold uppercase tracking-[0.15em] text-[#050811] transition-transform duration-200 hover:scale-105 disabled:opacity-50"
              data-testid="wa-test-send"
            >
              <Send className="h-3.5 w-3.5" />
              {sending ? "Sending…" : "Send Test Alert"}
            </button>
            <button
              onClick={logout}
              disabled={loggingOut}
              className="mt-4 ml-3 inline-flex items-center gap-2 rounded-full border border-[#ff4466]/50 px-5 py-2.5 font-heading text-xs font-bold uppercase tracking-[0.15em] text-[#ff4466] transition-colors duration-200 hover:bg-[#ff4466]/10 disabled:opacity-50"
              data-testid="wa-logout"
            >
              <LogOut className="h-3.5 w-3.5" />
              {loggingOut ? "Unlinking…" : "Unlink WhatsApp"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
