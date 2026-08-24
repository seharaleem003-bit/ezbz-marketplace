import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
      // Catalogue photos imported from the supplier sheet are hosted on
      // Amazon's image CDN. Hotlinking works but isn't ours to rely on — if
      // these ever start failing, re-host the files and drop this entry.
      {
        protocol: "https",
        hostname: "m.media-amazon.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
