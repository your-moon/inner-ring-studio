import {
  BREAKPOINTS,
  BRAND_COLORS,
  COLOR_TOKEN_GROUPS,
  DENSITIES,
  DENSITY_METRICS,
  FONT_STACK,
  FONT_WEIGHTS,
  FOUNDATION_MOTION,
  ICON_SIZES,
  INTENT_TOKENS,
  TYPOGRAPHY_TOKENS,
  Z_INDEX,
} from "./foundations";

describe("design foundations", () => {
  it("keeps responsive, icon, and stacking scales ordered", () => {
    expect(Object.values(BREAKPOINTS)).toEqual(
      [...Object.values(BREAKPOINTS)].sort((a, b) => a - b),
    );
    expect(Object.values(ICON_SIZES)).toEqual(
      [...Object.values(ICON_SIZES)].sort((a, b) => a - b),
    );
    expect(Object.values(Z_INDEX)).toEqual(
      [...Object.values(Z_INDEX)].sort((a, b) => a - b),
    );
  });

  it("defines metrics for every supported density", () => {
    expect(Object.keys(DENSITY_METRICS)).toEqual([...DENSITIES]);

    for (const density of DENSITIES) {
      const { control, gap, row } = DENSITY_METRICS[density];
      expect(control).toBeLessThanOrEqual(row);
      expect(gap).toBeGreaterThan(0);
    }
  });

  it("keeps semantic CSS variable names unique", () => {
    const variables = [
      ...COLOR_TOKEN_GROUPS.flatMap((group) =>
        group.tokens.map((token) => token.variable),
      ),
      ...INTENT_TOKENS.map((token) => token.variable),
    ];

    expect(new Set(variables).size).toBe(variables.length);
  });

  it("uses Linear's measured primary and focus colors", () => {
    expect(BRAND_COLORS).toEqual({
      primary: "#5e6ad2",
      hover: "#6974e1",
      focus: "#5e69d1",
    });
  });

  it("matches the Linear-derived variable typography ladder", () => {
    expect(FONT_STACK.startsWith('"Inter Variable"')).toBe(true);
    expect(Object.values(FONT_WEIGHTS)).toEqual([450, 500, 550, 600]);
    expect(TYPOGRAPHY_TOKENS.map((token) => token.value)).toEqual(
      expect.arrayContaining([
        "12px / 16px",
        "13px / 20px",
        "14px / 22px",
        "15px / 24px",
      ]),
    );
  });

  it("keeps motion durations progressive", () => {
    const { base, fast, instant, slow, slower } = FOUNDATION_MOTION.duration;

    expect(instant).toBe(0);
    expect(fast).toBeLessThan(base);
    expect(base).toBeLessThan(slow);
    expect(slow).toBeLessThan(slower);
  });
});
