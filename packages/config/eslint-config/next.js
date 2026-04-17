import pluginNext from "@next/eslint-plugin-next";
import { baseConfig } from "./base.js";
import tseslint from "typescript-eslint";

export const nextConfig = tseslint.config(...baseConfig, {
  plugins: {
    "@next/next": pluginNext,
  },
  rules: {
    ...pluginNext.configs.recommended.rules,
    ...pluginNext.configs["core-web-vitals"].rules,
  },
});
