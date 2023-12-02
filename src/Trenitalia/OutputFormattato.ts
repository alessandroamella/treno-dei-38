export default interface OutputFormattato {
    numero: number;
    treno: string;
    origine: string;
    destinazione: string;
    fermate: {
        stazione: string;
        id: string;
        dataProgrammata: number;
        dataEffettiva: number | null;
        transitato: boolean;
        soppressa: boolean;
    }[];
    ritardo: number;
    oraUltimoRilevamento: number;
    stazioneUltimoRilevamento: string | null;
    info: string;
}
