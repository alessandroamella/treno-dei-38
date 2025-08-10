import type Fermata from './Fermata';

export default interface StatoTreno {
    tipoTreno: string;
    orientamento: unknown;
    codiceCliente: number;
    fermateSoppresse: unknown;
    dataPartenza: unknown;
    fermate: Fermata[];
    anormalita: unknown;
    provvedimenti: unknown;
    segnalazioni: unknown;
    oraUltimoRilevamento: number;
    stazioneUltimoRilevamento: string;
    idDestinazione: string;
    idOrigine: string;
    cambiNumero: [];
    hasProvvedimenti: boolean;
    descOrientamento: string[];
    compOraUltimoRilevamento: `${number}:${number}`;
    motivoRitardoPrevalente: unknown;
    descrizioneVCO: string;
    materiale_label: unknown;
    numeroTreno: number;
    categoria: string;
    categoriaDescrizione: unknown;
    origine: string;
    codOrigine: string;
    destinazione: string;
    codDestinazione: unknown;
    origineEstera: unknown;
    destinazioneEstera: unknown;
    oraPartenzaEstera: unknown;
    oraArrivoEstera: unknown;
    tratta: number;
    regione: number;
    origineZero: string;
    destinazioneZero: string;
    orarioPartenzaZero: number;
    orarioArrivoZero: number;
    circolante: boolean;
    binarioEffettivoArrivoCodice: unknown;
    binarioEffettivoArrivoDescrizione: unknown;
    binarioEffettivoArrivoTipo: unknown;
    binarioProgrammatoArrivoCodice: unknown;
    binarioProgrammatoArrivoDescrizione: unknown;
    binarioEffettivoPartenzaCodice: unknown;
    binarioEffettivoPartenzaDescrizione: unknown;
    binarioEffettivoPartenzaTipo: unknown;
    binarioProgrammatoPartenzaCodice: unknown;
    binarioProgrammatoPartenzaDescrizione: unknown;
    subTitle: string;
    esisteCorsaZero: string;
    inStazione: boolean;
    haCambiNumero: boolean;
    nonPartito: boolean;
    provvedimento: number;
    riprogrammazione: unknown;
    orarioPartenza: number;
    orarioArrivo: number;
    stazionePartenza: unknown;
    stazioneArrivo: unknown;
    statoTreno: unknown;
    corrispondenze: unknown;
    servizi: [];
    ritardo: number;
    tipoProdotto: string;
    compOrarioPartenzaZeroEffettivo: `${number}:${number}`;
    compOrarioArrivoZeroEffettivo: `${number}:${number}`;
    compOrarioPartenzaZero: `${number}:${number}`;
    compOrarioArrivoZero: `${number}:${number}`;
    compOrarioArrivo: `${number}:${number}`;
    compOrarioPartenza: `${number}:${number}`;
    compNumeroTreno: string;
    compOrientamento: string[];
    compTipologiaTreno: string;
    compClassRitardoTxt: string;
    compClassRitardoLine: string;
    compImgRitardo2: string;
    compImgRitardo: string;
    compRitardo: [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
    ];
    compRitardoAndamento: [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
    ];
    compInStazionePartenza: string[];
    compInStazioneArrivo: string[];
    compOrarioEffettivoArrivo: string;
    compDurata: `${number}:${number}`;
    compImgCambiNumerazione: string;
    dataPartenzaTreno: number;
}
