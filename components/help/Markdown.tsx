import { Fragment, type ReactNode } from "react";

/**
 * Markdown minimale per il Help Center.
 *
 * Gli articoli li scriviamo noi, quindi non serve un parser completo: titoli,
 * paragrafi, elenchi, citazioni, grassetto, codice e link. Niente HTML grezzo,
 * così un articolo non può iniettare markup.
 */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${keyPrefix}-${index}`;
    index += 1;

    if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={key} className="border border-line bg-white/[0.04] px-1 py-0.5 font-mono text-[0.9em]">
          {token.slice(1, -1)}
        </code>
      );
    } else {
      const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(token);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        const external = /^https?:\/\//.test(href);
        nodes.push(
          <a
            key={key}
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="text-cyan underline decoration-cyan/40 underline-offset-4 transition-colors hover:decoration-cyan"
          >
            {label}
          </a>
        );
      }
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

  return nodes;
}

export default function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];

  let paragraph: string[] = [];
  let list: string[] = [];
  let ordered = false;
  let quote: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const text = paragraph.join(" ");
    blocks.push(
      <p key={`p-${key}`} className="text-sm leading-relaxed text-muted sm:text-base">
        {inline(text, `p-${key}`)}
      </p>
    );
    key += 1;
    paragraph = [];
  };

  const flushList = () => {
    if (list.length === 0) return;
    const items = list.map((item, index) => (
      <li key={`li-${key}-${index}`} className="flex gap-3">
        <span aria-hidden="true" className="mt-0.5 font-mono text-cyan">
          {ordered ? `${index + 1}.` : "+"}
        </span>
        <span>{inline(item, `li-${key}-${index}`)}</span>
      </li>
    ));

    blocks.push(
      ordered ? (
        <ol key={`list-${key}`} className="space-y-2 text-sm leading-relaxed text-muted sm:text-base">
          {items}
        </ol>
      ) : (
        <ul key={`list-${key}`} className="space-y-2 text-sm leading-relaxed text-muted sm:text-base">
          {items}
        </ul>
      )
    );
    key += 1;
    list = [];
  };

  const flushQuote = () => {
    if (quote.length === 0) return;
    blocks.push(
      <blockquote
        key={`q-${key}`}
        className="border-l-2 border-cyan/60 pl-4 text-sm leading-relaxed text-white/80 sm:text-base"
      >
        {inline(quote.join(" "), `q-${key}`)}
      </blockquote>
    );
    key += 1;
    quote = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim() === "") {
      flushParagraph();
      flushList();
      flushQuote();
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      flushQuote();

      const level = heading[1].length;
      const text = heading[2];

      blocks.push(
        level === 1 ? (
          <h2 key={`h-${key}`} className="font-poster text-2xl uppercase leading-none tracking-[-0.01em] text-white sm:text-3xl">
            {inline(text, `h-${key}`)}
          </h2>
        ) : level === 2 ? (
          <h2 key={`h-${key}`} className="mt-2 font-display text-lg font-semibold text-white">
            {inline(text, `h-${key}`)}
          </h2>
        ) : (
          <h3 key={`h-${key}`} className="mt-2 font-display text-base font-semibold text-white">
            {inline(text, `h-${key}`)}
          </h3>
        )
      );
      key += 1;
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const numbered = /^\d+\.\s+(.*)$/.exec(line);

    if (bullet || numbered) {
      flushParagraph();
      flushQuote();

      const isOrdered = Boolean(numbered);
      if (list.length > 0 && ordered !== isOrdered) flushList();
      ordered = isOrdered;
      list.push((bullet ?? numbered)?.[1] ?? "");
      continue;
    }

    const quoted = /^>\s?(.*)$/.exec(line);
    if (quoted) {
      flushParagraph();
      flushList();
      quote.push(quoted[1]);
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  flushQuote();

  return <div className="space-y-5">{blocks.map((block, index) => <Fragment key={index}>{block}</Fragment>)}</div>;
}
