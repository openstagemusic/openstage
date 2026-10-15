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
    <section className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6">
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-4 text-lg text-muted">{description}</p>
      {note ? (
        <p className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted">
          {note}
        </p>
      ) : null}
    </section>
  );
}
