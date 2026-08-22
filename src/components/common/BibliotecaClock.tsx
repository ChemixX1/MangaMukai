import { useEffect, useState } from "react";

type FlipClockTileProps = {
  compact?: boolean;
  isLight: boolean;
  label: string;
  previousValue: string;
  value: string;
};

const FlipClockTile = ({ compact = false, isLight, label, previousValue, value }: FlipClockTileProps) => {
  const hasChanged = previousValue !== value;
  const digitClassName = `absolute inset-x-0 flex h-[200%] items-center justify-center font-mono font-black leading-none tracking-[-0.1em] ${compact ? "text-[clamp(.9rem,3.5vw,1.15rem)] lg:text-[1.05rem]" : "text-[clamp(1.55rem,8vw,2.25rem)] lg:text-[1.95rem]"} ${isLight ? "text-zinc-950" : "text-white"}`;
  const topFace = isLight ? "bg-white" : "bg-[#303034]";
  const bottomFace = isLight ? "bg-[#d9d9dc]" : "bg-[#202024]";

  return (
    <div
      role="img"
      aria-label={`${label}: ${value}`}
      className={`library-flip-tile relative min-w-0 overflow-hidden border transition-colors duration-300 ${compact ? "aspect-[2.1] rounded-[7px]" : "aspect-[1.25] rounded-[10px]"} ${isLight ? "border-black/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_5px_10px_rgba(15,23,42,.1)]" : "border-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,.11),0_6px_12px_rgba(0,0,0,.28)]"}`}
    >
      <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1/2 overflow-hidden ${topFace}`}>
        <span className={`${digitClassName} top-0`}>{value}</span>
      </span>
      <span aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-1/2 overflow-hidden ${bottomFace}`}>
        <span className={`${digitClassName} bottom-0`}>{value}</span>
      </span>

      {hasChanged && (
        <>
          <span aria-hidden="true" className={`library-flip-old-bottom absolute inset-x-0 bottom-0 h-1/2 overflow-hidden ${bottomFace}`}>
            <span className={`${digitClassName} bottom-0`}>{previousValue}</span>
          </span>
          <span key={`top-${label}-${value}`} aria-hidden="true" className={`library-flip-top-out absolute inset-x-0 top-0 h-1/2 overflow-hidden ${topFace}`}>
            <span className={`${digitClassName} top-0`}>{previousValue}</span>
            <span className="library-flip-top-shadow absolute inset-0" />
          </span>
          <span key={`bottom-${label}-${value}`} aria-hidden="true" className={`library-flip-bottom-in absolute inset-x-0 bottom-0 h-1/2 overflow-hidden ${bottomFace}`}>
            <span className={`${digitClassName} bottom-0`}>{value}</span>
            <span className="library-flip-bottom-shadow absolute inset-0" />
          </span>
        </>
      )}

      <span aria-hidden="true" className={`absolute inset-x-0 top-1/2 z-10 h-px ${isLight ? "bg-black/20 shadow-[0_1px_0_rgba(255,255,255,.65)]" : "bg-black/70 shadow-[0_1px_0_rgba(255,255,255,.05)]"}`} />
    </div>
  );
};

export const BibliotecaClock = ({ compact = false, dateOutside = false, isLight }: { compact?: boolean; dateOutside?: boolean; isLight: boolean }) => {
  const [clockTime, setClockTime] = useState(() => {
    const initialTime = new Date();
    return { current: initialTime, previous: initialTime };
  });

  useEffect(() => {
    let timer = 0;
    const tick = () => {
      setClockTime(({ current }) => ({ current: new Date(), previous: current }));
      timer = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    };

    timer = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    return () => window.clearTimeout(timer);
  }, []);

  const timeParts = [
    {
      label: "Horas",
      previousValue: clockTime.previous.getHours().toString().padStart(2, "0"),
      value: clockTime.current.getHours().toString().padStart(2, "0"),
    },
    {
      label: "Minutos",
      previousValue: clockTime.previous.getMinutes().toString().padStart(2, "0"),
      value: clockTime.current.getMinutes().toString().padStart(2, "0"),
    },
    {
      label: "Segundos",
      previousValue: clockTime.previous.getSeconds().toString().padStart(2, "0"),
      value: clockTime.current.getSeconds().toString().padStart(2, "0"),
    },
  ];
  const dateLabel = clockTime.current.toLocaleDateString("es-PE", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const clockFace = (
    <div className={`border transition-colors duration-300 ${compact ? "rounded-xl p-1" : "rounded-[18px] p-2"} ${isLight ? "border-black/10 bg-[#f1f1f3] shadow-[0_0_0_2px_rgba(251,146,60,.12),0_12px_26px_rgba(15,23,42,.11)]" : "border-white/10 bg-[#050505] shadow-[0_0_0_2px_rgba(251,146,60,.18),0_14px_30px_rgba(0,0,0,.3)]"}`}>
      <div className={`grid grid-cols-3 ${compact ? "gap-1" : "gap-1.5"}`}>
        {timeParts.map((part) => (
          <FlipClockTile key={part.label} {...part} compact={compact} isLight={isLight} />
        ))}
      </div>
      {!dateOutside && (
        <p className={`anta-library-date text-center capitalize ${compact ? "mt-0.5 text-[8px] leading-tight" : "mt-2 text-[11px] sm:text-xs"} ${isLight ? "text-zinc-700" : "text-white/80"}`}>
          {dateLabel}
        </p>
      )}
    </div>
  );

  if (!dateOutside) return clockFace;

  return (
    <div className="w-full">
      <p className={`anta-library-date mb-1.5 text-center text-base font-semibold capitalize leading-4 sm:text-[17px] ${isLight ? "text-zinc-800" : "text-white/90"}`}>
        {dateLabel}
      </p>
      {clockFace}
    </div>
  );
};
