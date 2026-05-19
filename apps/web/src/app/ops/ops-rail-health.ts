import type { RailHealthSnapshot } from "./ops-stream-messages";
import { titleize } from "./ops-format";

export const railHealthClassNames: Record<RailHealthSnapshot["status"], string> = {
  degraded: "text-amber-300",
  incident: "text-bankops-negative",
  nominal: "text-bankops-positive",
};

export const railHealthLabels: Record<RailHealthSnapshot["status"], string> = {
  degraded: "Degraded",
  incident: "Incident",
  nominal: "Nominal",
};

export const railHealthSeverity: Record<RailHealthSnapshot["status"], number> = {
  degraded: 1,
  incident: 2,
  nominal: 0,
};

export function railStatusLabel(rail: RailHealthSnapshot) {
  return `${titleize(rail.rail)} ${railHealthLabels[rail.status]}`;
}
