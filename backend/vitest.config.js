import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/unit/**/*.test.js"],
    coverage: {
      provider: "v8",
      include: ["src/services/couponService.js", "src/services/orderService.js"],
      reporter: ["text", "json", "html"],
      thresholds: {
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      "config/db": path.resolve(__dirname, "tests/mocks/db.js"),
      "../config/db": path.resolve(__dirname, "tests/mocks/db.js"),
      "../../config/db": path.resolve(__dirname, "tests/mocks/db.js"),
    },
  },
});
