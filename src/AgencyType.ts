import Stop from "./Seta/Stop";
import { TperStop } from "./Tper";

export type CombinedStop = Stop | TperStop;
export type AgencyType = "seta" | "tper";
export const isAgencyType = (a: unknown): a is AgencyType =>
    a === "seta" || a === "tper";
