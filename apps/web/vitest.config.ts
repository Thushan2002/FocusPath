import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    // Integration tests share one test database.
    fileParallelism: false,
  },
});
