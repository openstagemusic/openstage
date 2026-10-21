/**
 * Persistent Spotify player.
 *
 * The dock only renders when a real playlist id is configured through
 * NEXT_PUBLIC_SPOTIFY_PLAYLIST_ID — no placeholder or fake content.
 * Reserved slot for the fixed player above the mobile navigation.
 */
export default function SpotifyPlayerDock() {
  const playlistId = process.env.NEXT_PUBLIC_SPOTIFY_PLAYLIST_ID;

  if (!playlistId) {
    return null;
  }

  return (
    <div className="spotify-dock fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur">
      <iframe
        title="Spotify"
        src={`https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0`}
        width="100%"
        height="80"
        style={{ border: 0 }}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      />
    </div>
  );
}
