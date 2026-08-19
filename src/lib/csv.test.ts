import { parseCsv } from "./csv";

describe("parseCsv", () => {
  it("parses headers and rows", () => {
    expect(parseCsv("a,b\n1,2\n3,4")).toEqual({
      headers: ["a", "b"],
      rows: [
        ["1", "2"],
        ["3", "4"],
      ],
    });
  });

  it("handles quoted fields with embedded commas", () => {
    expect(parseCsv('name,note\n"Doe, John",hi').rows).toEqual([
      ["Doe, John", "hi"],
    ]);
  });

  it("handles doubled-quote escaping", () => {
    expect(parseCsv('q\n"he said ""hi"""').rows).toEqual([['he said "hi"']]);
  });

  it("handles newlines inside quoted fields", () => {
    expect(parseCsv('a\n"line1\nline2"').rows).toEqual([["line1\nline2"]]);
  });

  it("strips a BOM and trims headers", () => {
    expect(parseCsv("﻿ a , b \n1,2").headers).toEqual(["a", "b"]);
  });

  it("drops fully-empty trailing rows", () => {
    expect(parseCsv("a,b\n1,2\n\n").rows).toEqual([["1", "2"]]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n").rows).toEqual([["1", "2"]]);
  });
});
