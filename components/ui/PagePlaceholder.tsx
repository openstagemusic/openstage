export default function PagePlaceholder({
  title,
  description,
  note,
}: {
  title: string;
  description: string;
  note?: string;
}) {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">OpenStage</p>
      <h1 className="mt-3 font-poster text-4xl uppercase leading-[0.92] tracking-[-0.02em] sm:text-6xl">{title}</h1>
      <p className="mt-4 text-lg text-muted">{description}</p>
      {note ? (
        <p className="mt-10 os-note">
          {note}
        </p>
      ) : null}
    </section>
  );
}
