import { describe, expect, test } from "vitest";
import { buildColFilterParams } from "./ColumnFilters";

describe("buildColFilterParams", () => {
  test("text/select/ref/boolean filters become a single cf_<field> param", () => {
    expect(
      buildColFilterParams({
        nickname: { kind: "text", value: "Pólvora" },
        enabled: { kind: "boolean", value: "1" },
        difficulty: { kind: "select", value: "hard" },
        UserID: { kind: "ref", value: "1000", label: "Canhoneiro" },
      }),
    ).toEqual({
      cf_nickname: "Pólvora",
      cf_enabled: "1",
      cf_difficulty: "hard",
      cf_UserID: "1000",
    });
  });

  test("number range becomes cf_<field>_min / cf_<field>_max, each only when set", () => {
    expect(buildColFilterParams({ level: { kind: "number", min: "10", max: "50" } })).toEqual({
      cf_level_min: "10",
      cf_level_max: "50",
    });
    expect(buildColFilterParams({ level: { kind: "number", min: "10" } })).toEqual({ cf_level_min: "10" });
    expect(buildColFilterParams({ level: { kind: "number", max: "50" } })).toEqual({ cf_level_max: "50" });
    expect(buildColFilterParams({ level: { kind: "number" } })).toEqual({});
  });

  test("an empty/cleared value produces no param", () => {
    expect(buildColFilterParams({ nickname: { kind: "text", value: "" } })).toEqual({});
    expect(buildColFilterParams({})).toEqual({});
  });
});
