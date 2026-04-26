import { describe, expect, it } from "vitest";

const EMAIL_REGEX =
  /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?!\.)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;

function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value);
}

describe("isValidEmail", () => {
  const invalidCases = [
    ".test@example.com",
    "test.@example.com",
    "test..name@example.com",
    "test@.example.com",
    "test@example..com",
    "test@example",
    "notanemail",
    "",
    "ivan@ex.a",
  ];

  const validCases = [
    "user@example.com",
    "user+tag@example.com",
    "user_name@sub.domain.com",
    "a@b.cd",
    "A@B.CO",
    "user-name@example.org",
    "user.name@example.com",
  ];

  it.each(invalidCases)("rejects invalid email: %s", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  it.each(validCases)("accepts valid email: %s", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });
});
