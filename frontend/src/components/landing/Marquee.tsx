const ITEMS = [
  "MULTIPLAYER FREE ROAM VR",
  "AI PHOTO BOOTH",
  "PHYSICAL ESCAPE ROOMS",
  "DIGITAL SCARY HOUSE",
  "SUPER REALITY 360 DOME",
  "IMMERSIVE ROOMS",
  "MASSAGE CHAIR KIOSKS",
  "CUSTOM EVENT ACTIVATIONS",
  "TURNKEY DEPLOYMENT ACROSS INDIA",
];

export default function Marquee() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div
      className="relative overflow-hidden border-y border-[#00f0ff]/15 bg-[#070c18] py-4"
      data-testid="ticker-marquee"
    >
      <div className="animate-marquee flex w-max items-center">
        {[0, 1].map((half) => (
          <div key={half} className="flex items-center">
            {row.map((item, i) => (
              <span key={`${half}-${i}`} className="flex items-center">
                <span className="whitespace-nowrap px-6 font-mono text-xs uppercase tracking-[0.3em] text-slate-400">
                  {item}
                </span>
                <span className="text-[#00f0ff]">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
