import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
};

// next-intl "without i18n routing" : la locale vient du cookie NEXT_LOCALE
// (voir i18n/request.ts, résolu par le plugin — compatible Turbopack/Next 16).
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
