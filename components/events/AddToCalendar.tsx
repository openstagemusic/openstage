type AddToCalendarProps = {
  /** Già costruito dal server: contiene i dati della serata e il link alla scheda. */
  googleUrl: string;
  /** Il file `.ics` servito da `/api/events/<id>/ical`. */
  icsUrl: string;
  labels: {
    add: string;
    google: string;
    apple: string;
  };
};

/**
 * "Aggiungi al calendario".
 *
 * Due link veri, nessun JavaScript: Google Calendar per chi ce l'ha nel browser,
 * il file `.ics` per tutto il resto (iPhone, Outlook, i calendari dei telefoni).
 * Il menu è un `<details>` del browser, quindi funziona anche se lo script non
 * parte — e non c'è niente da chiudere a mano: si apre, si sceglie, si va.
 */
export default function AddToCalendar({ googleUrl, icsUrl, labels }: AddToCalendarProps) {
  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white transition-colors hover:border-cyan/40 hover:text-cyan [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true">＋</span>
        {labels.add}
      </summary>

      <div className="absolute left-0 z-30 mt-2 w-60 rounded-2xl border border-white/10 bg-[#0b0b14] p-1.5 shadow-2xl">
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl px-3 py-2 text-sm text-white/90 transition-colors hover:bg-white/5 hover:text-cyan"
        >
          {labels.google}
        </a>
        <a
          href={icsUrl}
          download
          className="block rounded-xl px-3 py-2 text-sm text-white/90 transition-colors hover:bg-white/5 hover:text-cyan"
        >
          {labels.apple}
        </a>
      </div>
    </details>
  );
}
