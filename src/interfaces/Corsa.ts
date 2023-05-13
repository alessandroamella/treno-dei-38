import { Trip as GTFSTrip } from "gtfs-types";

interface Corsa {
    id: string;
    linea: string;
    destinazione: string | null;
    arrivoProgrammato: string | null;
    arrivoTempoReale: string | null;
    busNum: string | null;
    postiTotali: number | null;
    numPasseggeri: number | null;
    prossimaFermata: string | null;
    tempoReale: boolean;
    trip?: GTFSTrip;
}

export default Corsa;
