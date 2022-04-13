interface Corsa {
    id: string;
    linea: string;
    destinazione: string;
    arrivoProgrammato: string;
    arrivoTempoReale: string | null;
    busNum: string | null;
    postiTotali: number | null;
    numPasseggeri: number | null;
    prossimaFermata: string | null;
}

export default Corsa;
