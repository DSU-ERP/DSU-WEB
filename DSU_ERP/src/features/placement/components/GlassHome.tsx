"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Settings2 } from "lucide-react";
import {
  GlassAppearancePanel,
  glassDefaults,
  glassVariables,
  glassWorkspaceStyles,
  normalizeGlass,
  type GlassSettings,
} from "@/components/ui/adjustable-glass-dashboard";

gsap.registerPlugin(useGSAP);

/** Officer Home starts a little more opaque than the stock glass so numbers stay legible over the photo. */
const HOME_GLASS: GlassSettings = { ...glassDefaults, opacity: 0.42, tint: "#eef3e8" };
const STORAGE_KEY = "dsu-po-glass";
const listeners = new Set<() => void>();

// The officer's appearance choice is a per-browser convenience, so it lives in
// localStorage behind try/catch and the page renders the default without it.
function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
function writeStored(value: GlassSettings | null) {
  try {
    if (value) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Storage blocked: the change still applies until the page reloads. */
  }
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => event.key === STORAGE_KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
function parse(raw: string | null): GlassSettings {
  if (!raw) return HOME_GLASS;
  try {
    return normalizeGlass({ ...HOME_GLASS, ...(JSON.parse(raw) as Partial<GlassSettings>) });
  } catch {
    return HOME_GLASS;
  }
}

/**
 * The glass surface for the placement officer Home: campus photo, frosted
 * main panel, the "Adjust glass" control and a one-time staggered reveal of
 * every `.gw-reveal` panel. The page content itself is server-rendered.
 */
export function GlassHome({
  eyebrow,
  title,
  actions,
  background,
  children,
}: {
  eyebrow: ReactNode;
  title: string;
  actions?: ReactNode;
  background: string;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId().replace(/:/g, "");
  const raw = useSyncExternalStore(subscribe, readStored, () => null);
  const material = parse(raw);
  const [open, setOpen] = useState(false);
  const [backgroundFailed, setBackgroundFailed] = useState(false);

  useEffect(() => {
    if (open) root.current?.querySelector<HTMLButtonElement>(".gw-material button")?.focus();
  }, [open]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const panels = root.current?.querySelectorAll(".gw-reveal");
        if (!panels?.length) return;
        gsap.fromTo(
          panels,
          { y: 12, opacity: 0.45, filter: "blur(3px)" },
          {
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.48,
            stagger: 0.045,
            ease: "power3.out",
            clearProps: "transform,opacity,filter",
          },
        );
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  function update(patch: Partial<GlassSettings>) {
    writeStored(normalizeGlass({ ...material, ...patch }));
  }
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <div
      ref={root}
      className="gw-root po-glass"
      style={glassVariables(material, `color-mix(in srgb, var(--po-glass-base) 80%, ${material.tint})`)}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) close();
      }}
    >
      <style>{glassWorkspaceStyles}</style>
      {!backgroundFailed && (
        // A decorative, pre-sized local photo; next/image adds nothing behind a blur.
        <img className="gw-room" src={background} alt="" decoding="async" onError={() => setBackgroundFailed(true)} />
      )}
      <div className="gw-room-shade" aria-hidden="true" />
      <div className="gw-main gw-glass po-glass-main">
        <header className="gw-view-heading">
          <div>
            <p className="gw-greeting">{eyebrow}</p>
            <h1>{title}</h1>
          </div>
          <div className="gw-heading-action po-glass-actions">
            {actions}
            <button
              type="button"
              className="gw-adjust"
              ref={trigger}
              aria-expanded={open}
              aria-controls={`${id}-material`}
              onClick={() => setOpen((value) => !value)}
            >
              <Settings2 size={16} aria-hidden="true" />
              <span>Adjust glass</span>
            </button>
            {/* Anchored to the actions row so it opens just below its button at any width. */}
            {open && (
              <GlassAppearancePanel
                id={`${id}-material`}
                material={material}
                onChange={update}
                onReset={() => writeStored(null)}
                onClose={close}
                presetList={[
                  { name: "Clear", value: { blur: 10, opacity: 0.2, saturation: 1.1, edge: 0.8 } },
                  { name: "Frosted", value: HOME_GLASS },
                  { name: "Solid", value: { blur: 32, opacity: 0.86, saturation: 1, edge: 0.35 } },
                ]}
              />
            )}
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
