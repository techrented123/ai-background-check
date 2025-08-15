export function riskBadgeClass(level?: string) {
  switch ((level || "medium").toLowerCase()) {
    case "low":
      return "bg-green-100 text-green-800";
    case "high":
      return "bg-red-100 text-red-800";
    case "medium":
    default:
      return "bg-yellow-100 text-yellow-800";
  }
}
