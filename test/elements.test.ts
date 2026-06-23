import { describe, expect, it } from "vitest";
import { beats, comps, darkVsLight } from "../src/engine/elements";

describe("elemental wheel", () => {
  it("Fire > Earth > Wind > Water > Fire", () => {
    expect(beats("Fire", "Earth")).toBe(true);
    expect(beats("Earth", "Wind")).toBe(true);
    expect(beats("Wind", "Water")).toBe(true);
    expect(beats("Water", "Fire")).toBe(true);
    // not symmetric
    expect(beats("Earth", "Fire")).toBe(false);
    expect(beats("Fire", "Water")).toBe(false);
  });

  it("Light beats Dark; physical elements are neutral to Light/Dark", () => {
    expect(beats("Light", "Dark")).toBe(true);
    expect(beats("Dark", "Light")).toBe(false);
    expect(beats("Fire", "Light")).toBe(false);
    expect(beats("Light", "Fire")).toBe(false);
  });

  it("darkVsLight detects the Dark-attacks-Light matchup", () => {
    expect(darkVsLight("Dark", "Light")).toBe(true);
    expect(darkVsLight("Light", "Dark")).toBe(false);
  });

  it("hybrid elements count as all their components", () => {
    expect(comps("Dark & Light")).toEqual(["Dark", "Light"]);
    expect(beats("Dark & Light", "Dark")).toBe(true); // via the Light component
    expect(beats("Light", "Dark & Light")).toBe(true); // hybrid contains Dark
    expect(darkVsLight("Dark", "Dark & Light")).toBe(true); // hybrid contains Light
  });
});
