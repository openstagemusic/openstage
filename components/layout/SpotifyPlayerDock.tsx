/**
 * Player Spotify persistente.
 *
 * Si accende solo con una playlist reale pubblicata dalla redazione: senza
 * righe in `spotify_playlists` il dock non esiste, nessun contenuto finto.
 * Resta sopra la barra mobile (il posizionamento è in `globals.css`).
 */
export default function SpotifyPlayerDock({
  embedUrl,
  title,
}: {
  embedUrl: string | null;
  title: string;
}) {
  if (!embedUrl) {
    return null;
  }

  return (
    <div className="spotify-dock fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur">
      <iframe
        title={title}
        src={embedUrl}
        width="100%"
        height="80"
        style={{ border: 0 }}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      />
    </div>
  );
}
