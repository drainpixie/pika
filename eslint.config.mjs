// @ts-check

import { includeIgnoreFile } from "@eslint/compat";
import { fileURLToPath, URL } from "node:url";

import eslint from "@eslint/js";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

const gitignorePath = fileURLToPath(new URL(".gitignore", import.meta.url));

export default tseslint.config(
  includeIgnoreFile(gitignorePath),

  eslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  prettier,
);
