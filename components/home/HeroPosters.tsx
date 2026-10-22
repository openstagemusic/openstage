import type { PublicEvent } from "@/lib/events/types";
import { coverSrcSet, coverVariant } from "@/lib/images/covers";

type HeroPostersProps = {
  events: PublicEvent[];
};

const POSITIONS = [
  "poster-tile--1",
  "poster-tile--2",
  "poster-tile--3",
  "poster-tile--4",
] as const;

/**
 * Il muro di locandine dell'hero: solo eventi veri, nessuna immagine di
 * repertorio. È decorativo: le serate cliccabili sono nella lista sotto, quindi
 * il muro resta fuori dall'albero di lettura. Le quattro locandine entrano una
 * alla volta; con `prefers-reduced-motion` sono subito ferme.
 */
export default function HeroPosters({ events }: HeroPostersProps) {
  const posters = events.filter((event) => event.coverImageUrl).slice(0, 4);

  if (posters.length === 0) {
    return null;
  }

  return (
    <div aria-hidden="true" className="poster-wall">
      <span className="poster-wall-ghost">LIVE</span>

      {posters.map((event, index) => (
        <div key={event.id} className={`poster-tile ${POSITIONS[index]}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- locandine da URL arbitrari */}
          <img
            src={coverVariant(event.coverImageUrl, 640) ?? undefined}
            srcSet={coverSrcSet(event.coverImageUrl, [320, 480, 640, 960])}
            sizes="(max-width: 1023px) 50vw, 400px"
            alt=""
            loading={index < 2 ? "eager" : "lazy"}
            fetchPriority={index < 2 ? "high" : "auto"}
            decoding="async"
            referrerPolicy="no-referrer"
          />
        </div>
      ))}
    </div>
  );
}
