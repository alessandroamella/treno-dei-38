import Fermata from "./Fermata";

export default interface StatoTreno {
    tipoTreno: string;
    orientamento: any;
    codiceCliente: number;
    fermateSoppresse: any;
    dataPartenza: any;
    fermate: Fermata[];
    anormalita: any;
    provvedimenti: any;
    segnalazioni: any;
    oraUltimoRilevamento: number;
    stazioneUltimoRilevamento: string;
    idDestinazione: string;
    idOrigine: string;
    cambiNumero: [];
    hasProvvedimenti: boolean;
    descOrientamento: string[];
    compOraUltimoRilevamento: `${number}:${number}`;
    motivoRitardoPrevalente: any;
    descrizioneVCO: string;
    materiale_label: any;
    numeroTreno: number;
    categoria: string;
    categoriaDescrizione: any;
    origine: string;
    codOrigine: any;
    destinazione: string;
    codDestinazione: any;
    origineEstera: any;
    destinazioneEstera: any;
    oraPartenzaEstera: any;
    oraArrivoEstera: any;
    tratta: number;
    regione: number;
    origineZero: string;
    destinazioneZero: string;
    orarioPartenzaZero: number;
    orarioArrivoZero: number;
    circolante: boolean;
    binarioEffettivoArrivoCodice: any;
    binarioEffettivoArrivoDescrizione: any;
    binarioEffettivoArrivoTipo: any;
    binarioProgrammatoArrivoCodice: any;
    binarioProgrammatoArrivoDescrizione: any;
    binarioEffettivoPartenzaCodice: any;
    binarioEffettivoPartenzaDescrizione: any;
    binarioEffettivoPartenzaTipo: any;
    binarioProgrammatoPartenzaCodice: any;
    binarioProgrammatoPartenzaDescrizione: any;
    subTitle: string;
    esisteCorsaZero: string;
    inStazione: boolean;
    haCambiNumero: boolean;
    nonPartito: boolean;
    provvedimento: number;
    riprogrammazione: any;
    orarioPartenza: number;
    orarioArrivo: number;
    stazionePartenza: any;
    stazioneArrivo: any;
    statoTreno: any;
    corrispondenze: any;
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
        string
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
        string
    ];
    compInStazionePartenza: string[];
    compInStazioneArrivo: string[];
    compOrarioEffettivoArrivo: string;
    compDurata: `${number}:${number}`;
    compImgCambiNumerazione: string;
    dataPartenzaTreno: number;
}
