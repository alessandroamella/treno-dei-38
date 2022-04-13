export default interface OutputFormattato {
    treno: string;
    origine: string;
    destinazione: string;
    fermate: {
        stazione: string;
        id: string;
        dataProgrammata: number;
        dataEffettiva: number | null;
        transitato: boolean;
    }[];
    ritardo: number;
    oraUltimoRilevamento: number;
    stazioneUltimoRilevamento: string | null;
}
