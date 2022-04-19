import OutputFormattato from "./OutputFormattato";

type _TrenoTabellone = Omit<
    OutputFormattato,
    "fermate" | "origine" | "oraUltimoRilevamento" | "stazioneUltimoRilevamento"
>;

interface TrenoTabellone extends _TrenoTabellone {
    // orarioArrivo: string; // `${number}:${number}`
    orarioArrivo: number; // `${number}:${number}`
    idOrigine: string;
}

export default TrenoTabellone;
