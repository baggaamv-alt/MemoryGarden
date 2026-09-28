"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** Patient dialogs are larger and softer; caregiver dialogs are compact. */
  tone?: "patient" | "caregiver";
  wide?: boolean;
  labelledBy?: string;
};

/** Accessible modal: focus moves in, Escape closes (when allowed), background is inert. */
export function Dialog({ open, onClose, title, children, tone = "patient", wide, labelledBy }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const titleId = labelledBy ?? `${id}-title`;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const focusable = () =>
      Array.from(node?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? []).filter(
        (el) => !el.hasAttribute("disabled"),
      );
    (focusable()[0] ?? node)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) onClose();
      if (e.key === "Tab") {
        const els = focusable();
        if (!els.length) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  const patient = tone === "patient";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6" role="presentation">
      <div className="absolute inset-0 bg-[#3b3355]/35 backdrop-blur-[2px] animate-fade" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={
          patient
            ? `relative w-full ${wide ? "max-w-3xl" : "max-w-xl"} max-h-[92dvh] overflow-y-auto rounded-[2rem] border-2 border-line bg-paper p-6 shadow-lift animate-rise sm:p-8`
            : `relative w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[90dvh] overflow-y-auto rounded-2xl border border-[#e7e0d3] bg-white p-6 shadow-lift animate-rise`
        }
      >
        {title && (
          <h2 id={titleId} className={patient ? "mb-4 text-2xl font-extrabold" : "mb-3 text-lg font-bold"}>
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
