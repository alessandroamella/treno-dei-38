import Stop from "./Seta/Stop";
import { TperStop } from "./Tper";

export type CombinedStop = Stop | TperStop;
export type AgencyType = "seta" | "tper";
export type AgencyTypeCombined = AgencyType | "trenitalia";
export const isAgencyType = (a: unknown): a is AgencyType =>
    a === "seta" || a === "tper";
export const isAgencyTypeCombined = (a: unknown): a is AgencyTypeCombined =>
    isAgencyType(a) || a === "trenitalia";
