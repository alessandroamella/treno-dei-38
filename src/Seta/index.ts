import axios from "axios";
import moment from "moment";
import path from "path";
import fs from "fs";
import util from "util";
import { logger } from "../logger";
import Corsa from "./Corsa";
import RawData from "./RawData";
import RawError, { isRawError } from "./RawError";
import Stop, { isStop } from "./Stop";

class Seta {
    private static fermate: Stop[] | null = null;

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
                // no arrivals scheduled in the next 90 minutes
                if (isRawError(err?.response?.data)) {
                    logger.debug("SETA no arrivals in the next 90 minutes");
                    return [];
                }

                logger.warn("SETA request Axios error");
                logger.warn(err?.response?.data || err);
            } else {
                logger.error("SETA request error");
                logger.error(err);
            }
            return null;
        }

        if (!data) {
            logger.error("SETA no data for stop " + stopId);
            return null;
        } else if (isRawError(data)) {
            logger.info("SETA raw error for stop " + stopId);
            return [];
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

    public async cercaFermata(stopId: string): Promise<Stop | null> {
        if (!Seta.fermate) {
            try {
                const p = path.join(process.cwd(), "./stops.json");

                const rfES6 = util.promisify(fs.readFile);
                const f = await rfES6(p, { encoding: "utf-8" });

                const obj = JSON.parse(f);

                if (!Array.isArray(obj) || obj.some(s => !isStop(s))) {
                    throw new Error("Invalid stops obj: " + f);
                }

                logger.debug("Fermate SETA caricate");
                Seta.fermate = obj;
            } catch (err) {
                logger.error("Error while reading stops");
                logger.error(err);
                return null;
            }
        }

        logger.debug("Cerco fermata " + stopId);
        return Seta.fermate.find(s => s.stopId === stopId) || null;
    }
}

export default Seta;
