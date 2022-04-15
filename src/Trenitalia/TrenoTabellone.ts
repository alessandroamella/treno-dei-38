import OutputFormattato from "./OutputFormattato";

type _TrenoTabellone = Omit<
    OutputFormattato,
    "fermate" | "origine" | "oraUltimoRilevamento" | "stazioneUltimoRilevamento"
>;

interface TrenoTabellone extends _TrenoTabellone {
    orarioArrivo: string; // `${number}:${number}`
}

export default TrenoTabellone;
