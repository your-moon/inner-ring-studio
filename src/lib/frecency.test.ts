import { frecencyScore, recencyWeight } from "./frecency";

const HOUR = 3_600_000;
const DAY = 86_400_000;
const WEEK = 604_800_000;

describe("recencyWeight (zoxide buckets)", () => {
  it("weights the last hour ×4", () => {
    expect(recencyWeight(0)).toBe(4);
    expect(recencyWeight(HOUR - 1)).toBe(4);
  });

  it("weights the last day ×2", () => {
    expect(recencyWeight(HOUR)).toBe(2);
    expect(recencyWeight(DAY - 1)).toBe(2);
  });

  it("weights the last week ×0.5", () => {
    expect(recencyWeight(DAY)).toBe(0.5);
    expect(recencyWeight(WEEK - 1)).toBe(0.5);
  });

  it("weights older than a week ×0.25", () => {
    expect(recencyWeight(WEEK)).toBe(0.25);
    expect(recencyWeight(WEEK * 10)).toBe(0.25);
  });
});

describe("frecencyScore", () => {
  const now = 1_700_000_000_000;

  it("multiplies count by the recency weight", () => {
    expect(frecencyScore(3, now, now)).toBe(12); // 3 × 4 (just now)
    expect(frecencyScore(5, now - HOUR * 2, now)).toBe(10); // 5 × 2 (this day)
    expect(frecencyScore(4, now - WEEK * 2, now)).toBe(1); // 4 × 0.25 (old)
  });

  it("ranks recent-but-rare above old-but-frequent past a week", () => {
    const recentRare = frecencyScore(1, now - HOUR / 2, now); // 1 × 4 = 4
    const oldFrequent = frecencyScore(10, now - WEEK * 2, now); // 10 × 0.25 = 2.5
    expect(recentRare).toBeGreaterThan(oldFrequent);
  });
});
