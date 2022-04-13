import axios from "axios";
import moment from "moment";
import { logger } from "../logger";
import Corsa from "./Corsa";
import RawData from "./RawData";
import RawError, { isRawError } from "./RawError";

class Seta {
    public async caricaCorse(stopId: string): Promise<Corsa[] | null> {
        let data: RawData | RawError;
        try {
            data = (
                await axios.get(
                    "https://avm.setaweb.it/SETA_WS/services/arrival/" + stopId
                )
            ).data;
        } catch (err) {
            if (axios.isAxiosError(err)) {
                logger.warn(err?.response?.data || err);
            }
            logger.error(err);
            return null;
        }

        if (!data) {
            logger.error("SETA no data for stop " + stopId);
            return null;
        } else if (isRawError(data)) {
            logger.info("SETA raw error for stop " + stopId);
            return null;
        }

        const corse: Corsa[] = data.arrival.services.map(s => ({
            id: s.codice_corsa,
            linea: s.service,
            destinazione: s.destination,
            arrivoProgrammato: s.arrival,
            arrivoTempoReale: s.type === "realtime" ? s.arrival : null,
            busNum: s.busnum || null,
            postiTotali: s.posti_totali || null,
            numPasseggeri: s.num_passeggeri || null,
            prossimaFermata: s.next_stop || null
        }));

        for (let i = 0; i < corse.length; i++) {
            if (corse[i].arrivoTempoReale) {
                const j = corse.findIndex(
                    c => c.id === corse[i].id && !c.arrivoTempoReale
                );
                if (j !== -1) {
                    logger.debug(
                        `Rimossa corsa j=${j} (${corse[j].id}; destinazione=${corse[j].destinazione})`
                    );
                    corse[i].arrivoProgrammato = corse[j].arrivoProgrammato;
                    corse.splice(j, 1);
                    i--;
                }
            }
        }

        corse.sort(
            (a, b) =>
                moment(
                    a.arrivoTempoReale || a.arrivoProgrammato,
                    "HH:mm"
                ).unix() -
                moment(
                    b.arrivoProgrammato || b.arrivoProgrammato,
                    "HH:mm"
                ).unix()
        );

        return corse;
    }
}

export default Seta;
