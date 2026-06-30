const { vi } = require("vitest");

module.exports = {
  query: vi.fn(),
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
    end: vi.fn(),
  },
};
