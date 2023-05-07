import Stop from "../Seta/Stop";
import { TperStop } from "../Tper";

export type CombinedStop = Stop | TperStop;
export type AgencyType = "seta" | "tper";
export type NewsType = AgencyType | "trenitalia" | "ferrovie.info";
export const isAgencyType = (a: unknown): a is AgencyType =>
    a === "seta" || a === "tper";
export const isNewsType = (a: unknown): a is NewsType =>
    isAgencyType(a) || a === "trenitalia" || a === "ferrovie.info";
