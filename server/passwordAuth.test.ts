import { describe, expect, it } from "vitest";
import {
  hashPassword,
  normalizeEmail,
  verifyPassword,
} from "./_core/passwordAuth";

describe("password auth helpers", () => {
  it("normalizes emails before credential lookup", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
  });

  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("correct-password");

    expect(hash).toMatch(/^scrypt:v1:/);
    await expect(verifyPassword("correct-password", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });
});
