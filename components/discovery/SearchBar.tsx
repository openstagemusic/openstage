"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import type { EventSuggestion } from "@/lib/events/queries";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";

import { useScrollAnchor } from "./useScrollAnchor";

/**
 * Barra di ricerca con suggerimenti live raggruppati.
 *
 * I suggerimenti arrivano dal nostro database (`/api/suggest`), quindi non
 * esistono suggerimenti che portano fuori da OpenStage. La ricerca vive nella
 * URL: il risultato è condivisibile e la pagina resta renderizzata dal server.
 */
export default function SearchBar({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const t = dict.search;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const listId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const rememberScroll = useScrollAnchor();

  const urlQuery = searchParams.get("q") ?? "";
  const [value, setValue] = useState(urlQuery);
  const [items, setItems] = useState<EventSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [searching, setSearching] = useState(false);

  // Indietro/avanti del browser: il campo resta allineato alla URL.
  useEffect(() => {
    setValue(urlQuery);
  }, [urlQuery]);

  // Suggerimenti: una richiesta per pausa di digitazione, annullando la
  // precedente (niente risposte fuori ordine).
  useEffect(() => {
    const term = value.trim();

    if (term.length < 2) {
      setItems([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);

      try {
        const response = await fetch(`/api/suggest?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(String(response.status));

        const payload = (await response.json()) as { suggestions: EventSuggestion[] };
        setItems(payload.suggestions ?? []);
        setActive(-1);
        setOpen(true);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setItems([]);
      } finally {
        setSearching(false);
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  // Un clic fuori chiude l'elenco.
  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const go = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, val] of Object.entries(patch)) {
      if (val === null || val === "") params.delete(key);
      else params.set(key, val);
    }

    // Cambiando ricerca o filtri si riparte dalla prima pagina.
    params.delete("page");

    const query = params.toString();
    rememberScroll();
    // `scroll: false`: chi filtra sta guardando i filtri, non deve tornare in cima.
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    setOpen(false);
  };

  const choose = (item: EventSuggestion) => {
    if (item.kind === "event" && item.id) {
      setOpen(false);
      router.push(`/eventi/${item.id}`);
      return;
    }

    // Il genere ha un filtro suo (più preciso della ricerca libera).
    if (item.kind === "genre") {
      go({ genre: item.label, q: null });
      return;
    }

    go({ q: item.label });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();

    const highlighted = active >= 0 ? items[active] : undefined;
    if (highlighted) {
      choose(highlighted);
      return;
    }

    go({ q: value.trim() || null });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (items.length === 0) return;
      setOpen(true);
      setActive((current) => (current + 1) % items.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (items.length === 0) return;
      setActive((current) => (current <= 0 ? items.length - 1 : current - 1));
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  const term = value.trim();
  const showHint = term.length > 0 && term.length < 2;
  const showEmpty = open && term.length >= 2 && !searching && items.length === 0;

  return (
    <div ref={boxRef} className="relative w-full">
      <form onSubmit={submit} role="search">
        <label htmlFor={`${listId}-input`} className="sr-only">
          {t.label}
        </label>

        <div className="glass flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 focus-within:border-white/25">
          <span aria-hidden="true" className="text-muted">
            ⌕
          </span>

          <input
            id={`${listId}-input`}
            type="text"
            inputMode="search"
            autoComplete="off"
            role="combobox"
            aria-expanded={open && items.length > 0}
            aria-controls={listId}
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            placeholder={t.placeholder}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onFocus={() => items.length > 0 && setOpen(true)}
            onKeyDown={onKeyDown}
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-muted"
          />

          {value ? (
            <button
              type="button"
              onClick={() => {
                setValue("");
                setItems([]);
                setOpen(false);
                go({ q: null });
              }}
              aria-label={t.clear}
              className="shrink-0 rounded-full border border-white/10 px-2 text-xs text-muted transition-colors hover:text-white"
            >
              ✕
            </button>
          ) : null}
        </div>
      </form>

      {open && items.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="glass absolute inset-x-0 top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-white/10 p-2"
        >
          {items.map((item, index) => {
            const isNewGroup = index === 0 || items[index - 1]?.kind !== item.kind;
            const meta =
              item.detail ??
              (item.hits > 1
                ? `${item.hits} ${t.eventMany}`
                : item.hits === 1
                  ? `1 ${t.eventOne}`
                  : null);

            return (
              <li key={`${item.kind}-${item.id ?? item.label}`}>
                {isNewGroup ? (
                  <p className="px-3 pb-1 pt-3 text-[11px] uppercase tracking-wide text-muted">
                    {t.kinds[item.kind]}
                  </p>
                ) : null}

                <button
                  type="button"
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(item)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                    index === active ? "bg-white/10" : "hover:bg-white/5"
                  )}
                >
                  <span className="truncate">{item.label}</span>
                  {meta ? <span className="shrink-0 text-xs text-muted">{meta}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {showHint || showEmpty ? (
        <p className="glass absolute inset-x-0 top-full z-40 mt-2 rounded-2xl border border-white/10 px-4 py-3 text-xs text-muted">
          {showHint ? t.hint : t.noResults}
        </p>
      ) : null}
    </div>
  );
}
