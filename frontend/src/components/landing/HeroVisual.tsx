const ORBIT_PRODUCTS = [
  "Free Roam VR",
  "VR Games",
  "AI Photo Booth",
  "Escape Rooms",
  "Scary House",
  "Massage Kiosk",
  "Event Activations",
  "360 Dome",
  "Immersive Room",
];

export default function HeroVisual() {
  return (
    <div
      className="pointer-events-none absolute inset-y-0 right-0 flex w-full items-center justify-center opacity-50 md:w-[56%] md:opacity-100"
      data-testid="hero-visual"
    >
      <div className="relative aspect-square w-full max-w-[640px]">
        {/* soft glow core */}
        <div className="animate-glow-soft absolute inset-[16%] rounded-full bg-[#00f0ff]/15 blur-3xl" />

        {/* floating headset */}
        <div className="animate-float-tilt absolute inset-[7%]">
          <img
            src="/assets/hero/concept-headset.webp"
            alt="Halucinate VR headset floating in space"
            className="h-full w-full rounded-full border border-[#00f0ff]/20 object-cover shadow-[0_0_80px_rgba(0,240,255,0.25)]"
            style={{
              maskImage: "radial-gradient(circle, black 60%, transparent 71%)",
              WebkitMaskImage: "radial-gradient(circle, black 60%, transparent 71%)",
            }}
          />
        </div>

        {/* orbiting product holo-cards */}
        <div className="animate-orbit absolute inset-0 hidden md:block" data-testid="product-orbit">
          {ORBIT_PRODUCTS.map((name, i) => {
            const angle = (i / ORBIT_PRODUCTS.length) * 360;
            return (
              <div
                key={name}
                className="absolute left-1/2 top-1/2"
                style={{
                  transform: `rotate(${angle}deg) translateX(clamp(180px, 24vw, 310px)) rotate(${-angle}deg)`,
                }}
              >
                <div className="animate-orbit-rev">
                  <span className="inline-block -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-[#00f0ff]/35 bg-[#050811]/85 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#00f0ff] shadow-[0_0_18px_rgba(0,240,255,0.2)] backdrop-blur-md">
                    {name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
