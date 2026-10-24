"use client";

import { useEffect, useRef } from "react";

type TurnstileOptions = {
  sitekey: string;
  theme?: "light" | "dark" | "auto";
  action?: string;
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/**
 * Cloudflare Turnstile widget (real keys, no test stubs).
 * The token is forwarded to Supabase Auth as `captchaToken`.
 */
export default function TurnstileWidget({
  siteKey,
  onToken,
  theme = "dark",
  action,
  resetKey,
}: {
  siteKey: string;
  onToken: (token: string) => void;
  theme?: "light" | "dark" | "auto";
  action?: string;
  /** Cambia questo valore per far ripartire il widget dopo un errore. */
  resetKey?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const resetMountedRef = useRef(false);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    let cancelled = false;

    function cleanup() {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    }

    function render() {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme,
        action,
        callback: (token: string) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(""),
        "error-callback": () => onTokenRef.current(""),
      });
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);

    if (!existing && !window.turnstile) {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.addEventListener("load", render);
      document.head.appendChild(script);
      return () => {
        cancelled = true;
        script.removeEventListener("load", render);
        cleanup();
      };
    }

    render();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [siteKey, theme, action]);

  // Un token Turnstile è monouso: dopo un errore il form deve ripartire da zero.
  useEffect(() => {
    if (!resetMountedRef.current) {
      resetMountedRef.current = true;
      return;
    }
    if (resetKey === undefined || !widgetIdRef.current || !window.turnstile) return;
    window.turnstile.reset(widgetIdRef.current);
  }, [resetKey]);

  return <div ref={containerRef} />;
}
