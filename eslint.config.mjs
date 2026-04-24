// Flat config compatible with Next 14 + eslint 8.
// Keeps the default Next.js rules and adds a couple of preferences.
import nextPlugin from "eslint-config-next";

export default [
  {
    ignores: [".next", "node_modules", "playwright-report", "test-results", "coverage"],
  },
  ...[nextPlugin].flatMap((c) => (Array.isArray(c) ? c : [])),
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];
