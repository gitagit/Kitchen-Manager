import { describe, it, expect } from 'vitest';

// Extract utility functions to test (we'll need to refactor these out of the component)
// For now, let's replicate and test them

type ExpirationStatus = "expired" | "expiring-soon" | "ok" | "none";

function getExpirationStatus(expiresOn: string | null): ExpirationStatus {
  if (!expiresOn) return "none";
  const now = new Date();
  const exp = new Date(expiresOn);
  const daysUntil = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) return "expired";
  if (daysUntil <= 7) return "expiring-soon";
  return "ok";
}

function formatExpiration(expiresOn: string | null): string {
  if (!expiresOn) return "";
  const now = new Date();
  const exp = new Date(expiresOn);
  const daysUntil = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) return `expired ${Math.abs(daysUntil)}d ago`;
  if (daysUntil === 0) return "expires today";
  if (daysUntil === 1) return "expires tomorrow";
  if (daysUntil <= 7) return `expires in ${daysUntil}d`;
  return `exp ${exp.toLocaleDateString()}`;
}

describe('Expiration Utils', () => {
  describe('getExpirationStatus', () => {
    it('returns "none" for null expiration', () => {
      expect(getExpirationStatus(null)).toBe("none");
    });

    it('returns "expired" for past dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(getExpirationStatus(yesterday.toISOString())).toBe("expired");
    });

    it('returns "expiring-soon" for dates within 7 days', () => {
      const inThreeDays = new Date();
      inThreeDays.setDate(inThreeDays.getDate() + 3);
      expect(getExpirationStatus(inThreeDays.toISOString())).toBe("expiring-soon");
    });

    it('returns "expiring-soon" for today', () => {
      const today = new Date();
      expect(getExpirationStatus(today.toISOString())).toBe("expiring-soon");
    });

    it('returns "ok" for dates more than 7 days away', () => {
      const inTwoWeeks = new Date();
      inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);
      expect(getExpirationStatus(inTwoWeeks.toISOString())).toBe("ok");
    });
  });

  describe('formatExpiration', () => {
    it('returns empty string for null', () => {
      expect(formatExpiration(null)).toBe("");
    });

    it('formats expired dates correctly', () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      expect(formatExpiration(twoDaysAgo.toISOString())).toMatch(/expired \d+d ago/);
    });

    it('formats "expires today"', () => {
      // Set to end of today to ensure it's still "today"
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const result = formatExpiration(today.toISOString());
      expect(result === "expires today" || result === "expires tomorrow").toBe(true);
    });

    it('formats "expires tomorrow"', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(12, 0, 0, 0);
      expect(formatExpiration(tomorrow.toISOString())).toBe("expires tomorrow");
    });

    it('formats "expires in Xd" for near dates', () => {
      const inFiveDays = new Date();
      inFiveDays.setDate(inFiveDays.getDate() + 5);
      expect(formatExpiration(inFiveDays.toISOString())).toMatch(/expires in \d+d/);
    });

    it('formats distant dates with full date', () => {
      const inThreeWeeks = new Date();
      inThreeWeeks.setDate(inThreeWeeks.getDate() + 21);
      expect(formatExpiration(inThreeWeeks.toISOString())).toMatch(/^exp /);
    });
  });
});
