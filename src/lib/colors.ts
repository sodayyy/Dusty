const CATEGORY_COLORS: Record<string, string> = {
  software: "var(--chart-1)",
  system: "var(--chart-4)",
  cache: "var(--chart-2)",
  documents: "var(--chart-3)",
  installer: "var(--primary)",
  other: "var(--chart-5)",
};

export function catColorHex(category: string): string {
  const map: Record<string, string> = {
    software: "#4A90D9",
    system: "#E07060",
    cache: "#6DBF9E",
    documents: "#F0C070",
    installer: "#E8A87C",
  };
  return map[category] ?? "#A09080";
}

export function catColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "var(--chart-5)";
}
