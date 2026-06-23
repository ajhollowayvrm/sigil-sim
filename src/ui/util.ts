export function elemClass(e: string): string {
  return (
    { Fire: "fire", Water: "water", Earth: "earth", Wind: "wind", Light: "light", Dark: "dark", "Dark & Light": "dl" }[e] ?? ""
  );
}
