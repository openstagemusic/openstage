/**
 * La card Open Graph di una serata, in JSX per `next/og`.
 *
 * Sta in un file `.tsx` suo e non dentro la rotta perché le rotte di Next si
 * chiamano `route.ts`, dove il JSX non è ammesso.
 *
 * `ImageResponse` disegna su canvas con Satori: niente classi CSS, solo stili in
 * linea, `display: flex` su ogni contenitore e nessun `<Image />` di Next. La
 * locandina, se c'è, arriva già come `data:` URL (la scarica la rotta): qui non
 * si tocca la rete.
 */

export type EventOgCardProps = {
  /** Tipo di evento, già tradotto ("Concerto"). */
  kind: string;
  title: string;
  /** "sabato 8 novembre 2026 · 21:30" */
  when: string;
  /** "Locale · Città" */
  where: string;
  /** La locandina in base64, o `null` quando non c'è o non risponde. */
  photo: string | null;
  /** La serata è saltata: l'etichetta lo dice, invece di invitare. */
  cancelledLabel: string | null;
  /** Il claim del sito, in fondo alla card. */
  tagline: string;
};

export function eventOgCard({
  kind,
  title,
  when,
  where,
  photo,
  cancelledLabel,
  tagline,
}: EventOgCardProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#07070d",
        padding: 56,
        position: "relative",
      }}
    >
      {/* Gli aloni del sito: viola in alto a sinistra, ciano in basso a destra. */}
      <div
        style={{
          position: "absolute",
          top: -220,
          left: -160,
          width: 760,
          height: 760,
          borderRadius: 9999,
          background: "radial-gradient(circle, rgba(139,92,246,0.45) 0%, rgba(139,92,246,0) 70%)",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -280,
          right: -180,
          width: 800,
          height: 800,
          borderRadius: 9999,
          background: "radial-gradient(circle, rgba(34,211,238,0.32) 0%, rgba(34,211,238,0) 70%)",
          display: "flex",
        }}
      />

      {/* La locandina, intera. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 400,
          height: 518,
          borderRadius: 28,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.16)",
          background: photo
            ? "#101018"
            : "linear-gradient(135deg, rgba(139,92,246,0.65), rgba(34,211,238,0.45), rgba(244,114,182,0.55))",
          flexShrink: 0,
        }}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- ImageResponse disegna su canvas: niente next/image
          <img src={photo} width={400} height={518} style={{ objectFit: "contain" }} alt="" />
        ) : (
          <div
            style={{
              display: "flex",
              color: "#ffffff",
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: 2,
              textAlign: "center",
              padding: 24,
            }}
          >
            {kind.toUpperCase()}
          </div>
        )}
      </div>

      {/* Il testo. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flex: 1,
          paddingLeft: 48,
          paddingTop: 8,
          paddingBottom: 8,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 24,
              letterSpacing: 3,
              color: "#22d3ee",
              textTransform: "uppercase",
            }}
          >
            {kind}
            {cancelledLabel ? (
              <span
                style={{
                  display: "flex",
                  padding: "6px 18px",
                  borderRadius: 9999,
                  border: "1px solid rgba(244,114,182,0.7)",
                  background: "rgba(244,114,182,0.15)",
                  color: "#f472b6",
                  letterSpacing: 1,
                }}
              >
                {cancelledLabel}
              </span>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontSize: 58,
              lineHeight: 1.1,
              fontWeight: 700,
              color: "#e8e8f2",
            }}
          >
            {title}
          </div>

          <div style={{ display: "flex", marginTop: 28, fontSize: 30, color: "#ffffff" }}>
            {when}
          </div>

          {where ? (
            <div style={{ display: "flex", marginTop: 12, fontSize: 26, color: "#9aa0b8" }}>
              {where}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              width: 56,
              height: 6,
              borderRadius: 3,
              background: "linear-gradient(90deg, #8b5cf6, #22d3ee, #f472b6)",
            }}
          />
          <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: "#e8e8f2" }}>
            OpenStage
          </div>
          <div style={{ display: "flex", fontSize: 20, color: "#9aa0b8" }}>{tagline}</div>
        </div>
      </div>
    </div>
  );
}
