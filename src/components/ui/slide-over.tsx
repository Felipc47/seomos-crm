"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * Slide-over de 440px del mock SEOMOS: overlay con fade + panel derecho que
 * entra deslizándose. Cierra con clic en el overlay o Escape.
 */
export function SlideOver({
  onClose,
  children,
  ariaLabel,
}: {
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = rootRef.current;
    const dialog = dialogRef.current;
    if (!root || !dialog) return;
    const activeDialog = dialog;

    const background = [...document.body.children].filter((element) => element !== root);
    const previousInert = background.map((element) => ({
      element: element as HTMLElement,
      inert: (element as HTMLElement).inert,
    }));
    for (const { element } of previousInert) element.inert = true;

    const focusableSelector =
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = [...activeDialog.querySelectorAll<HTMLElement>(focusableSelector)].filter(
        (element) => !element.hidden && element.getClientRects().length > 0
      );
      if (focusable.length === 0) {
        e.preventDefault();
        activeDialog.focus();
        return;
      }
      const first = focusable[0]!;
      const last = focusable.at(-1)!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKey);
    const frame = requestAnimationFrame(() => {
      const preferred = activeDialog.querySelector<HTMLElement>(
        "[data-slide-over-autofocus], [autofocus]"
      );
      const current =
        document.activeElement instanceof HTMLElement &&
        activeDialog.contains(document.activeElement)
          ? document.activeElement
          : null;
      const first = activeDialog.querySelector<HTMLElement>(focusableSelector);
      (preferred ?? current ?? first ?? activeDialog).focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      for (const state of previousInert) state.element.inert = state.inert;
      previousFocus?.focus();
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div ref={rootRef} className="fixed inset-0 z-40">
      <div
        className="absolute inset-0 animate-[fade-in_.18s_ease] bg-black/40"
        onClick={onClose}
        role="presentation"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className="absolute bottom-0 right-0 top-0 flex w-full animate-[slide-in-right_.26s_cubic-bezier(.2,.8,.2,1)] flex-col border-l bg-surface shadow-[-16px_0_44px_rgba(0,0,0,.22)] sm:w-[440px] sm:max-w-[92vw]"
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
