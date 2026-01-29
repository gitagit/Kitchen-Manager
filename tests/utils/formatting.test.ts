import { describe, it, expect } from 'vitest';

// Cost formatting function
function formatCost(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

// Quantity scaling function from recipes
function scaleQuantity(quantityText: string | null, ratio: number): string | null {
  if (!quantityText || ratio === 1) return quantityText;

  // Match leading number (including fractions like 1/2, decimals like 1.5)
  const match = quantityText.match(/^(\d+(?:\/\d+)?(?:\.\d+)?)\s*(.*)$/);
  if (!match) return quantityText;

  let num: number;
  const numStr = match[1];
  const rest = match[2];

  // Handle fractions like "1/2"
  if (numStr.includes("/")) {
    const [numer, denom] = numStr.split("/").map(Number);
    num = numer / denom;
  } else {
    num = parseFloat(numStr);
  }

  const scaled = num * ratio;

  // Format nicely: avoid too many decimals
  let formatted: string;
  if (scaled === Math.floor(scaled)) {
    formatted = scaled.toString();
  } else if (scaled * 4 === Math.floor(scaled * 4)) {
    // Can express as quarter fraction
    const whole = Math.floor(scaled);
    const frac = scaled - whole;
    if (frac === 0.25) formatted = whole ? `${whole} 1/4` : "1/4";
    else if (frac === 0.5) formatted = whole ? `${whole} 1/2` : "1/2";
    else if (frac === 0.75) formatted = whole ? `${whole} 3/4` : "3/4";
    else formatted = scaled.toFixed(2).replace(/\.?0+$/, "");
  } else {
    formatted = scaled.toFixed(2).replace(/\.?0+$/, "");
  }

  return rest ? `${formatted} ${rest}` : formatted;
}

describe('Cost Formatting', () => {
  describe('formatCost', () => {
    it('returns dash for null', () => {
      expect(formatCost(null)).toBe("—");
    });

    it('returns dash for undefined', () => {
      expect(formatCost(undefined)).toBe("—");
    });

    it('formats 0 cents as $0.00', () => {
      expect(formatCost(0)).toBe("$0.00");
    });

    it('formats cents correctly', () => {
      expect(formatCost(499)).toBe("$4.99");
      expect(formatCost(1000)).toBe("$10.00");
      expect(formatCost(99)).toBe("$0.99");
      expect(formatCost(1)).toBe("$0.01");
    });

    it('formats large amounts', () => {
      expect(formatCost(10000)).toBe("$100.00");
      expect(formatCost(99999)).toBe("$999.99");
    });
  });
});

describe('Recipe Scaling', () => {
  describe('scaleQuantity', () => {
    it('returns null for null input', () => {
      expect(scaleQuantity(null, 2)).toBe(null);
    });

    it('returns original for ratio of 1', () => {
      expect(scaleQuantity("2 cups", 1)).toBe("2 cups");
    });

    it('scales whole numbers', () => {
      expect(scaleQuantity("2 cups", 2)).toBe("4 cups");
      expect(scaleQuantity("1 tablespoon", 3)).toBe("3 tablespoon");
    });

    it('scales decimal numbers', () => {
      expect(scaleQuantity("1.5 cups", 2)).toBe("3 cups");
    });

    it('scales fractions', () => {
      expect(scaleQuantity("1/2 cup", 2)).toBe("1 cup");
      expect(scaleQuantity("1/4 tsp", 4)).toBe("1 tsp");
    });

    it('produces nice fractions when possible', () => {
      expect(scaleQuantity("1 cup", 0.5)).toBe("1/2 cup");
      expect(scaleQuantity("1 cup", 0.25)).toBe("1/4 cup");
      expect(scaleQuantity("2 cups", 0.5)).toBe("1 cups");
    });

    it('handles mixed numbers', () => {
      expect(scaleQuantity("1 cup", 1.5)).toBe("1 1/2 cup");
    });

    it('returns original if no number found', () => {
      expect(scaleQuantity("some flour", 2)).toBe("some flour");
      expect(scaleQuantity("to taste", 2)).toBe("to taste");
    });

    it('handles numbers without units', () => {
      expect(scaleQuantity("2", 3)).toBe("6");
    });

    it('scales down correctly', () => {
      expect(scaleQuantity("4 cups", 0.5)).toBe("2 cups");
      expect(scaleQuantity("8 ounces", 0.25)).toBe("2 ounces");
    });
  });
});
