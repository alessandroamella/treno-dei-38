import axios from "axios";
import moment from "moment-timezone";
import { logger } from "../logger";
import { parseStringPromise } from "xml2js";
import Corsa from "../Seta/Corsa";

interface CustomErr {
    msg: string;
    status: number;
}

interface FnErr {
    err: CustomErr;
}

function isFnErr(err: unknown): err is FnErr {
    return (
        typeof err === "object" &&
        err !== null &&
        "err" in err &&
        typeof (err as any).err === "object" &&
        (err as any).err !== null &&
        "msg" in (err as any).err &&
        "status" in (err as any).err &&
        typeof (err as any).err.msg === "string" &&
        typeof (err as any).err.status === "number"
    );
}

class Tper {
    private static async _getTripsForRoute(
        stopId: string,
        route: string
    ): Promise<Corsa[] | FnErr> {
        let trips: Corsa[];
        let rawData: any;

        let res;
        try {
            res = await axios.get(
                "https://hellobuswsweb.tper.it/web-services/hello-bus.asmx/QueryHellobus",
                {
                    params: {
                        fermata: stopId,
                        linea: route,
                        oraHHMM: " "
                    }
                }
            );
            logger.debug(
                `TPER fetching data for stop ${stopId} - line ${route}`
            );
        } catch (err) {
            if (axios.isAxiosError(err)) {
                logger.debug("TPER data axios error:");
                logger.debug(err.response?.data || err.response || err.code);
                // DEBUG - MAP ERROR!!

                // data = err.response?.data || "Unknown error";
            } else {
                logger.error("TPER data unknown error:");
                logger.error(err);

                // data = "Unknown error";
            }
            return {
                err: { msg: "Error while fetching stop", status: 500 }
            } as FnErr;
        }

        let noTrips = true;

        rawData = res.data;

        if (!rawData) {
            logger.error("TPER rawData is falsy");
            return {
                err: { msg: "Error while loading data", status: 500 }
            };
        }
        try {
            const xmlData: any = await parseStringPromise(rawData);
            let str: string = xmlData.string._;
            if (str.startsWith("TperHellobus: ")) str = str.substring(14);
            else if (str.includes("ERR_TOO_MANY_REQUESTS_LOCK"))
                return {
                    err: {
                        msg: "TperHellobus requests limit reached",
                        status: 500
                    }
                } as FnErr;
            else if (str.includes("SERVICE FAILURE"))
                return {
                    err: { msg: "TperHellobus service failed", status: 500 }
                } as FnErr;
            else if (/FERMATA [0-9]+ NON GESTITA/g.test(str)) {
                return {
                    err: { msg: `Stop ${stopId} is unknown`, status: 200 }
                } as FnErr;
            } else
                return {
                    err: {
                        msg: `Invalid TperHellobus response: ${str}`,
                        status: 500
                    }
                } as FnErr;

            if (str.includes("OGGI NESSUNA ALTRA CORSA DI"))
                return [] as Corsa[];

            trips = str
                .split(", ")
                .map(e => {
                    const s = e.split(" ");
                    const busNumIndex = e.search(/\(Bus[0-9]+ CON PEDANA\)/g);
                    let busNum: string | undefined = undefined;
                    if (busNumIndex !== -1) {
                        const s1 = e.substring(busNumIndex);
                        const sIndex = s1.search(/[0-9]+/g);
                        if (sIndex === -1) {
                            logger.error("Invalid TPER s2 string format");
                            return;
                        }
                        busNum = s1.substring(sIndex)?.split(" ")[0];
                    }
                    // const time = _t.unix();
                    const t: Corsa = {
                        linea: s[0],
                        destinazione: null,
                        arrivoProgrammato: s[1] === "DaSatellite" ? null : s[2],
                        arrivoTempoReale: s[1] === "DaSatellite" ? s[2] : null,
                        busNum: busNum || null,
                        id: s[0] + busNum,
                        numPasseggeri: null,
                        postiTotali: null,
                        prossimaFermata: null,
                        tempoReale: s[1] === "DaSatellite"
                    };
                    noTrips = false;
                    return t;
                })
                .filter(e => !!e) as Corsa[];
        } catch (err) {
            logger.error("Error while fetching TPER routes");
            logger.error(err);
            return {
                err: { msg: "Error while loading data", status: 500 }
            };
        }

        if (!trips) {
            logger.debug("TPER no trips");
            if (noTrips) {
                return {
                    err: {
                        msg: "No more trips planned for today",
                        status: 200
                    }
                } as FnErr;
            } else {
                return {
                    err: { msg: "Error while loading data", status: 500 }
                } as FnErr;
            }
        }

        trips.sort(
            (a, b) =>
                moment(
                    a.arrivoTempoReale || a.arrivoProgrammato,
                    "HH:mm"
                ).unix() -
                moment(
                    b.arrivoTempoReale || b.arrivoProgrammato,
                    "HH:mm"
                ).unix()
        );

        return trips;
    }

    private static async _wait(ms = 500) {
        return new Promise((res, rej) => {
            setTimeout(res, ms);
        });
    }

    public async caricaCorse(
        stopId: string,
        linee: string[]
    ): Promise<Corsa[] | null> {
        const corse: Corsa[] = [];
        const jobs = [];

        for (const linea of linee) {
            const job = Tper._getTripsForRoute(stopId, linea)
                .then(corsa => {
                    if (isFnErr(corsa)) {
                        logger.error("TPER contains fnErr");
                        logger.error(corsa);
                        return null;
                    }
                    corse.push(...corsa);
                })
                .catch(err => {
                    logger.error("TPER request error");
                    logger.error(err);
                    return null;
                });
            jobs.push(job);
            // wait 500ms
            await Tper._wait(500);
        }

        await Promise.all(jobs);

        corse.sort(
            (a, b) =>
                moment(
                    a.arrivoTempoReale || a.arrivoProgrammato,
                    "HH:mm"
                ).unix() -
                moment(
                    b.arrivoTempoReale || b.arrivoProgrammato,
                    "HH:mm"
                ).unix()
        );

        return corse;
    }
}

export default Tper;
