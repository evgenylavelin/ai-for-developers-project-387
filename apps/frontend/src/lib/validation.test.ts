import { describe, expect, it } from "vitest";

import { isValidEmail } from "./validation";

describe("isValidEmail", () => {
  const validEmails = [
    "user@example.com",
    "user+tag@example.com",
    "user_name@sub.domain.com",
    "a@b.cd",
    "A@B.CO",
    "user-name@example.co.uk",
    "user.name@example.com",
    "user@x.io",
  ];

  const invalidEmails = [
    ".test@example.com",
    "test.@example.com",
    "test..name@example.com",
    "test@.example.com",
    "test@example..com",
    "test@example",
    "notanemail",
    "",
    "   ",
    "@example.com",
    "user@",
    "user@ex.a",
    "user@example.1",
    "user@example.c",
    "user@-example.com",
    "user@example-.com",
  ];

  it.each(validEmails)("accepts valid email: %s", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each(invalidEmails)("rejects invalid email: %s", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  it("rejects emails exceeding 254 characters", () => {
    const longLocal = "a".repeat(64);
    const longDomain = "b".repeat(190);
    const longEmail = `${longLocal}@${longDomain}.com`;
    expect(isValidEmail(longEmail)).toBe(false);
  });

  it("rejects local parts exceeding 64 characters", () => {
    const longLocal = "a".repeat(65);
    expect(isValidEmail(`${longLocal}@example.com`)).toBe(false);
  });

  it("accepts local parts up to 64 characters", () => {
    const local64 = "a".repeat(64);
    expect(isValidEmail(`${local64}@example.com`)).toBe(true);
  });
});
