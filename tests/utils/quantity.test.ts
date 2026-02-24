import { describe, it, expect } from "vitest";
import { parseQty, subtractQty } from "@/lib/quantity";

describe("parseQty", () => {
  it("parses whole number + unit", () => {
    const r = parseQty("2 cups");
    expect(r?.value).toBe(2);
    expect(r?.unit).toBe("cups");
    expect(r?.group).toBe("volume");
  });

  it("parses fraction", () => {
    const r = parseQty("1/4 tsp");
    expect(r?.value).toBeCloseTo(0.25);
    expect(r?.unit).toBe("tsp");
    expect(r?.group).toBe("volume");
  });

  it("parses mixed number", () => {
    const r = parseQty("1 1/2 lbs");
    expect(r?.value).toBeCloseTo(1.5);
    expect(r?.unit).toBe("lbs");
    expect(r?.group).toBe("weight");
  });

  it("parses decimal", () => {
    const r = parseQty("2.5 oz");
    expect(r?.value).toBeCloseTo(2.5);
    expect(r?.group).toBe("weight");
  });

  it("parses grams without space", () => {
    const r = parseQty("500g");
    expect(r?.value).toBe(500);
    expect(r?.unit).toBe("g");
    expect(r?.group).toBe("weight");
  });

  it("parses count unit", () => {
    const r = parseQty("3 eggs");
    expect(r?.value).toBe(3);
    expect(r?.unit).toBe("eggs");
    expect(r?.group).toBe("count");
  });

  it("parses bunch as count", () => {
    const r = parseQty("1 bunch");
    expect(r?.value).toBe(1);
    expect(r?.group).toBe("count");
  });

  it("returns null for no number", () => {
    expect(parseQty("a handful")).toBeNull();
    expect(parseQty("some")).toBeNull();
    expect(parseQty("")).toBeNull();
  });

  it("parses plain number with no unit as count", () => {
    const r = parseQty("3");
    expect(r?.value).toBe(3);
    expect(r?.group).toBe("count");
  });
});

describe("subtractQty", () => {
  it("subtracts same weight unit", () => {
    expect(subtractQty("5 lbs", "1 lb")).toBe("4 lbs");
  });

  it("subtracts same weight in grams", () => {
    expect(subtractQty("500g", "200g")).toBe("300 g");
  });

  it("subtracts same volume", () => {
    expect(subtractQty("2 cups", "1/2 cup")).toBe("1.5 cups");
  });

  it("subtracts cross-weight units (lbs from grams)", () => {
    // 1 lb = 453.592g; batch 500g - 453.592g = 46.41g
    const result = subtractQty("500g", "1 lb");
    expect(result).not.toBeNull();
    expect(parseFloat(result!)).toBeGreaterThan(0);
  });

  it("converts batch unit back after cross-unit subtraction", () => {
    // 1000g batch - 500g recipe = 500g = ~1.1 lbs
    const result = subtractQty("1 kg", "500g");
    expect(result).not.toBeNull();
    expect(result).toContain("kg");
  });

  it("returns null for incompatible groups (weight vs volume)", () => {
    expect(subtractQty("5 lbs", "2 cups")).toBeNull();
  });

  it("returns null for unknown unit vs volume", () => {
    expect(subtractQty("1 bag", "2 cups")).toBeNull();
  });

  it("returns '0' when fully depleted", () => {
    expect(subtractQty("2 lbs", "3 lbs")).toBe("0");
    expect(subtractQty("2 lbs", "2 lbs")).toBe("0");
  });

  it("applies scaleFactor", () => {
    // 2 cups - (1/2 cup * 2) = 2 - 1 = 1 cup
    expect(subtractQty("2 cups", "1/2 cup", 2)).toBe("1 cups");
  });

  it("returns '0' when scaled usage exceeds batch", () => {
    // 1 cup - (1/2 cup * 3) = 1 - 1.5 = depleted
    expect(subtractQty("1 cup", "1/2 cup", 3)).toBe("0");
  });

  it("returns null if batch can't be parsed", () => {
    expect(subtractQty("some flour", "1 cup")).toBeNull();
  });

  it("subtracts count units", () => {
    expect(subtractQty("12 eggs", "3 eggs")).toBe("9 eggs");
  });
});
