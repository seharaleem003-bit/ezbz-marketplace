import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Metadata is resolved before the response starts, for every request rather
  // than only for known crawlers. Streaming it means the HTTP status is
  // committed before generateMetadata runs, so notFound() on a missing listing
  // produced a 200 with the not-found page — a soft 404 that Google indexes as
  // a thin duplicate. The cost is a slightly later first byte on pages whose
  // metadata needs a query; this app is force-dynamic throughout, so that
  // trade is worth a correct status code.
  htmlLimitedBots: /.*/,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
      // Uploaded photos live in Vercel Blob, served from a per-store
      // subdomain. Without this the file uploads fine and then next/image
      // refuses to fetch it, so the listing shows an empty frame.
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
      // Catalogue rows imported with supplier image links.
      {
        protocol: "https",
        hostname: "m.media-amazon.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
