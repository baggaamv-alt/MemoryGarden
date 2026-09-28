export type MimoColor = "peach" | "lavender" | "sage" | "sky" | "butter" | "rose";

export const MIMO_COLORS: Record<MimoColor, { body: string; shade: string; belly: string; feet: string; label: { en: string; te: string } }> = {
  peach: { body: "#FFC4A3", shade: "#F2A27F", belly: "#FFE6D6", feet: "#E48C6B", label: { en: "Peach", te: "పీచ్" } },
  lavender: { body: "#CDB8F2", shade: "#AE95E0", belly: "#ECE3FC", feet: "#9C80D3", label: { en: "Lavender", te: "లావెండర్" } },
  sage: { body: "#BFE0B4", shade: "#98C689", belly: "#E4F3DE", feet: "#7FB16F", label: { en: "Sage green", te: "లేత ఆకుపచ్చ" } },
  sky: { body: "#B4DCF5", shade: "#8CC0E4", belly: "#E0F1FC", feet: "#72A9D4", label: { en: "Sky blue", te: "ఆకాశ నీలం" } },
  butter: { body: "#FBE29B", shade: "#EDC764", belly: "#FFF4D4", feet: "#D9AE4C", label: { en: "Sunshine", te: "బంగారు పసుపు" } },
  rose: { body: "#F9C2CF", shade: "#EC9DB1", belly: "#FDE6EC", feet: "#DE8499", label: { en: "Rose", te: "గులాబీ" } },
};

export function mimoColor(c: string | undefined) {
  return MIMO_COLORS[(c as MimoColor) in MIMO_COLORS ? (c as MimoColor) : "peach"];
}
