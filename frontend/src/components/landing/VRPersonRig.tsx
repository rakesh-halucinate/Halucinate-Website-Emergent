import { useEffect, useRef, useState } from "react";

export type RigPointer = { current: { x: number; y: number } };

// Column order mirrors the viewer: cursor right -> he looks toward the viewer's right
// (his head rotates to HIS left, so the "his-left" renders sit on the right columns).
const GRID: string[][] = [
  ["up-right", "up-right", "up", "up-left", "up-left"],
  ["far-right", "right", "center", "left", "far-left"],
  ["down-right", "down-right", "down", "down-left", "down-left"],
];

const SRC = (pose: string) => `/assets/hero/rig/${pose}.webp`;
const ALL_POSES = [...new Set(GRID.flat())];

export default function VRPersonRig({ pointer }: { pointer: RigPointer }) {
  const [pose, setPose] = useState("center");
  const smooth = useRef({ x: 0, y: 0 });
  const frame = useRef(0);
  const lastMove = useRef(Date.now());

  useEffect(() => {
    ALL_POSES.forEach((p) => {
      const img = new Image();
      img.src = SRC(p);
    });
  }, []);

  useEffect(() => {
    const loop = () => {
      const idle = Date.now() - lastMove.current > 3500;
      if (idle) {
        const t = Date.now() / 1000;
        pointer.current.x = Math.sin(t * 0.4) * 0.55;
        pointer.current.y = Math.sin(t * 0.27) * 0.3;
      }
      smooth.current.x += (pointer.current.x - smooth.current.x) * 0.07;
      smooth.current.y += (pointer.current.y - smooth.current.y) * 0.07;

      const col = Math.min(4, Math.max(0, Math.round(((smooth.current.x + 1) / 2) * 4)));
      const row = Math.min(2, Math.max(0, Math.round(((smooth.current.y + 1) / 2) * 2)));
      const next = GRID[row][col];
      setPose((prev) => (prev === next ? prev : next));
      frame.current = requestAnimationFrame(loop);
    };
    frame.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame.current);
  }, [pointer]);

  useEffect(() => {
    const mark = () => { lastMove.current = Date.now(); };
    window.addEventListener("pointermove", mark, { passive: true });
    return () => window.removeEventListener("pointermove", mark);
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-y-0 right-0 flex w-full items-end justify-center opacity-40 md:w-[58%] md:justify-end md:opacity-100"
      data-testid="vr-person-rig"
    >
      <div
        className="relative h-[78%] w-full max-w-[560px] transition-transform duration-300 ease-out md:h-[88%]"
        style={{
          transform: `translate3d(${smooth.current.x * -14}px, ${smooth.current.y * -8}px, 0)`,
        }}
      >
        {ALL_POSES.map((p) => (
          <img
            key={p}
            src={SRC(p)}
            alt={p === "center" ? "Person wearing a Halucinate VR headset" : ""}
            aria-hidden={p !== "center"}
            draggable={false}
            className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-300 ease-out ${
              pose === p ? "opacity-100" : "opacity-0"
            }`}
            style={{
              maskImage: "linear-gradient(to bottom, black 72%, transparent 98%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 72%, transparent 98%)",
            }}
          />
        ))}
        {/* neon ground glow under the person */}
        <div className="absolute -bottom-6 left-1/2 h-24 w-[130%] -translate-x-1/2 rounded-[100%] bg-[#00f0ff]/12 blur-3xl" />
      </div>
    </div>
  );
}
