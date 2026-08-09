function toEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com") || parsed.hostname === "youtu.be") {
      const videoId =
        parsed.hostname === "youtu.be"
          ? parsed.pathname.slice(1)
          : parsed.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    if (parsed.hostname.includes("vimeo.com")) {
      const videoId = parsed.pathname.split("/").filter(Boolean).pop();
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function VideoWalkaround({
  videos,
}: {
  videos: { id: string; url: string; caption: string | null }[];
}) {
  if (videos.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-heading font-semibold">Video walkaround</h2>
      {videos.map((video) => {
        const embedUrl = toEmbedUrl(video.url);
        return (
          <div key={video.id} className="overflow-hidden rounded-lg bg-black">
            <div className="aspect-video w-full">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  title={video.caption ?? "Video walkaround"}
                  className="size-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video src={video.url} controls className="size-full" />
              )}
            </div>
            {video.caption ? (
              <p className="bg-card px-3 py-2 text-sm text-muted-foreground">{video.caption}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
