import OutputFormattato from "./OutputFormattato";

type TrenoTabellone = Omit<
    OutputFormattato,
    "fermate" | "origine" | "oraUltimoRilevamento" | "stazioneUltimoRilevamento"
>;

export default TrenoTabellone;
