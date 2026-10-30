import { cn } from "@/lib/utils";

export type FreeTool = {
  title: string;
  text: string;
};

/**
 * Elenco degli strumenti inclusi nelle pagine "Per gli artisti" e "Per le
 * venue". Righe editoriali con indice, niente card e niente prezzi: qui si dice
 * cosa si può usare e a quali condizioni, non cosa si può comprare.
 */
export default function FreeTools({
  items,
  note,
  className,
}: {
  items: FreeTool[];
  note?: string;
  className?: string;
}) {
  return (
    <div className={cn(className)}>
      <ul className="border-t border-line">
        {items.map((item, index) => (
          <li
            key={item.title}
            className="grid grid-cols-[2.5rem_1fr] gap-4 border-b border-line py-5"
          >
            <span className="font-mono text-[10px] tracking-[0.12em] text-cyan">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h3 className="font-display text-base font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{item.text}</p>
            </div>
          </li>
        ))}
      </ul>

      {note ? (
        <p className="mt-5 border-l border-cyan/50 pl-4 text-sm leading-relaxed text-white/80">
          {note}
        </p>
      ) : null}
    </div>
  );
}
