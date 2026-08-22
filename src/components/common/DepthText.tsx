import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import "./DepthText.css";

const MAX_LAYERS = 64;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getLayerColor = (
  faceColor: string,
  depthColor: string,
  index: number,
  total: number,
  faceBlend = 72,
) => {
  const progress = total <= 1 ? 1 : index / total;
  const eased = progress * progress;
  const safeFaceBlend = clamp(faceBlend, 0, 92);
  const faceMix = Math.round((1 - eased) * safeFaceBlend + 4);
  return `color-mix(in srgb, ${faceColor} ${faceMix}%, ${depthColor})`;
};

const getTransform = (rotateX: number, rotateY: number) =>
  `rotateX(${rotateX.toFixed(3)}deg) rotateY(${rotateY.toFixed(3)}deg)`;

export interface DepthTextPart {
  text: string;
  faceColor: string;
  depthColor: string;
  faceBlend?: number;
}

interface DepthTextProps {
  text?: string;
  parts?: DepthTextPart[];
  layers?: number;
  depth?: number;
  faceColor?: string;
  depthColor?: string;
  tilt?: number;
  pointerTracking?: boolean;
  smoothing?: number;
  perspective?: number;
  autoOrbit?: boolean;
  orbitSpeed?: number;
  fontSize?: string;
  fontWeight?: number;
  shadow?: boolean;
  className?: string;
  style?: CSSProperties;
}

export const DepthText = ({
  text = "Elevate",
  parts,
  layers = 34,
  depth = 2.4,
  faceColor = "#f8fafc",
  depthColor = "#7c3aed",
  tilt = 7.5,
  pointerTracking = true,
  smoothing = 0.14,
  perspective = 900,
  autoOrbit = true,
  orbitSpeed = 0.35,
  fontSize = "clamp(3rem, 12vw, 7rem)",
  fontWeight = 900,
  shadow = true,
  className = "",
  style,
}: DepthTextProps) => {
  const rootRef = useRef<HTMLSpanElement>(null);
  const stageRef = useRef<HTMLSpanElement>(null);

  const safeLayers = clamp(Math.round(Number(layers) || 1), 2, MAX_LAYERS);
  const safeDepth = clamp(Number(depth) || 0, 0, 12);
  const safeTilt = clamp(Number(tilt) || 0, 0, 12);
  const safeSmoothing = clamp(Number(smoothing) || 0.14, 0.02, 0.35);
  const safePerspective = clamp(Number(perspective) || 900, 300, 2000);
  const safeOrbitSpeed = clamp(Number(orbitSpeed) || 0, 0, 2);
  const textParts = useMemo<DepthTextPart[]>(
    () => parts?.length ? parts : [{ text, faceColor, depthColor }],
    [depthColor, faceColor, parts, text],
  );

  const baseRotation = useMemo(
    () => ({ x: -safeTilt * 0.32, y: safeTilt * 0.42 }),
    [safeTilt],
  );

  const depthLayers = useMemo(
    () => Array.from({ length: safeLayers }, (_, layerIndex) => {
      const index = safeLayers - layerIndex;
      return {
        index,
        transform: `translateZ(${-index * safeDepth}px)`,
      };
    }),
    [safeDepth, safeLayers],
  );

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const canTrackPointer = pointerTracking && finePointer && !reducedMotion;
    let frameId = 0;
    let activePointer = false;
    const startTime = performance.now();
    const current = { ...baseRotation };
    const target = { ...baseRotation };

    const applyTransform = () => {
      stage.style.transform = getTransform(current.x, current.y);
    };

    if (reducedMotion) {
      applyTransform();
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      activePointer = true;
      const x = clamp((event.clientX - (rect.left + rect.width / 2)) / (rect.width * 0.8), -1, 1);
      const y = clamp((event.clientY - (rect.top + rect.height / 2)) / (rect.height * 0.8), -1, 1);
      target.x = baseRotation.x - y * safeTilt;
      target.y = baseRotation.y + x * safeTilt;
    };

    const handlePointerLeave = () => {
      activePointer = false;
      target.x = baseRotation.x;
      target.y = baseRotation.y;
    };

    if (canTrackPointer) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerleave", handlePointerLeave);
      window.addEventListener("blur", handlePointerLeave);
    }

    const tick = (now: number) => {
      if ((!canTrackPointer || !activePointer) && autoOrbit) {
        const elapsed = (now - startTime) / 1000;
        const orbit = elapsed * safeOrbitSpeed * Math.PI * 2;
        const fallbackAmount = canTrackPointer ? 0.18 : 0.55;
        target.x = baseRotation.x + Math.sin(orbit) * safeTilt * fallbackAmount;
        target.y = baseRotation.y + Math.cos(orbit * 0.85) * safeTilt * fallbackAmount;
      }

      current.x += (target.x - current.x) * safeSmoothing;
      current.y += (target.y - current.y) * safeSmoothing;
      applyTransform();
      frameId = window.requestAnimationFrame(tick);
    };

    applyTransform();
    frameId = window.requestAnimationFrame(tick);

    return () => {
      if (canTrackPointer) {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerleave", handlePointerLeave);
        window.removeEventListener("blur", handlePointerLeave);
      }
      window.cancelAnimationFrame(frameId);
    };
  }, [autoOrbit, baseRotation, pointerTracking, safeOrbitSpeed, safeSmoothing, safeTilt]);

  const rootStyle = {
    ...style,
    "--depth-text-perspective": `${safePerspective}px`,
    "--depth-text-font-size": fontSize,
    "--depth-text-font-weight": fontWeight,
    "--depth-text-shadow": shadow
      ? `0 22px 34px color-mix(in srgb, ${depthColor} 36%, transparent), 0 4px 8px rgba(0, 0, 0, 0.28)`
      : "none",
  } as CSSProperties;

  return (
    <span ref={rootRef} className={`depth-text ${className}`.trim()} style={rootStyle}>
      <span ref={stageRef} className="depth-text__stage">
        {depthLayers.map((layer) => (
          <span
            aria-hidden="true"
            className="depth-text__layer"
            key={layer.index}
            style={{ transform: layer.transform }}
          >
            {textParts.map((part, partIndex) => (
              <span
                key={`${part.text}-${partIndex}`}
                style={{
                  color: getLayerColor(
                    part.faceColor,
                    part.depthColor,
                    layer.index,
                    safeLayers,
                    part.faceBlend,
                  ),
                }}
              >
                {partIndex > 0 ? "\u00a0" : ""}{part.text}
              </span>
            ))}
          </span>
        ))}
        <span className="depth-text__face">
          {textParts.map((part, partIndex) => (
            <span key={`${part.text}-${partIndex}`} style={{ color: part.faceColor }}>
              {partIndex > 0 ? "\u00a0" : ""}{part.text}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
};
