import EventCover from "@/components/events/EventCover";
import type { PublicEvent } from "@/lib/events/types";
import { cn } from "@/lib/utils";

type HeroPostersProps = {
  events: PublicEvent[];
};

/**
 * Il muro di locandine dell'hero: solo eventi veri, nessuna immagine di
 * repertorio. È decorativo (le serate sono già negli elenchi), quindi resta
 * fuori dall'albero di lettura e si vede solo da desktop.
 */
export default function HeroPosters({ events }: HeroPostersProps) {
  const posters = events.filter((event) => event.coverImageUrl).slice(0, 3);

  if (posters.length === 0) {
    return null;
  }

  return (
    <div aria-hidden="true" className="relative hidden lg:block">
      <div className="absolute -inset-8 rounded-[2.5rem] bg-violet/10 blur-3xl" />

      <div className="relative grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <Poster event={posters[0]} className="-rotate-1 aspect-[4/5]" />
          {posters[1] ? <Poster event={posters[1]} className="rotate-[0.5deg] aspect-square" /> : null}
        </div>

        <div className="mt-10 space-y-4">
          {posters[2] ? <Poster event={posters[2]} className="rotate-1 aspect-[4/5]" /> : null}
        </div>
      </div>
    </div>
  );
}

function Poster({
  event,
  className,
}: {
  event: PublicEvent;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-card border border-line shadow-lift transition-transform duration-500 ease-out-expo hover:rotate-0",
        className
      )}
    >
      <EventCover src={event.coverImageUrl} className="h-full w-full" />
    </div>
  );
}
