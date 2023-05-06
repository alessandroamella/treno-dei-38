import axios from "axios";
import moment, { Moment } from "moment-timezone";
import { logger } from "../logger";
import { parseStringPromise } from "xml2js";
import Corsa from "../Seta/Corsa";
import Stop from "../Seta/Stop";
import Fuse from "fuse.js";
import News from "../Seta/News";
import { fetchUrlWithCurl, rssParser } from "./News";
import { Item } from "rss-parser";

interface CustomErr {
    msg: string;
    status: number;
}

interface FnErr {
    err: CustomErr;
}

export interface TperStop extends Stop {
    routes: string[];
}

interface StopsObj {
    [stopId: string]: Omit<TperStop, "stopId">;
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
    private static _fermate: TperStop[] | null = null;
    private static isCaching: boolean = false;
    private static cacheDate: Moment | null = null;

    private static newsUrl = "https://www.tper.it/taxonomy/term/33/all/rss.xml";
    private static newsCache: News[] | null = null;
    private static newsCacheDate: Moment | null = null;

    private static set fermate(fermate: TperStop[] | null) {
        Tper._fermate = fermate;
    }

    private static get fermate(): TperStop[] | null {
        if (Tper._isCacheOutdated()) Tper._cacheStops();
        return Tper._fermate;
    }

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
                        id: s[0] + (busNum || ""),
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
        linee?: string[]
    ): Promise<Corsa[] | null> {
        const corse: Corsa[] = [];
        const jobs = [];

        if (!linee) {
            const s = await this.cercaFermata(stopId);
            if (!s) {
                logger.debug("TPER caricaCorse can't find stop");
                return [];
            }
            linee = s.routes;
        }

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

    private static async _cacheStops(): Promise<boolean> {
        try {
            if (Tper.isCaching) {
                logger.info("TPER cache already in progress");
                return false;
            }
            logger.info("Creo cache TPER...");

            Tper.isCaching = true;

            const { data } = await axios.post(
                "https://solwsweb.tper.it/web-services/open-data.asmx/OpenDataLineeFermate"
            );

            logger.info("TPER cache loaded, parsing...");

            const parsed = await parseStringPromise(data);

            const stops: StopsObj = {};
            for (const stop of parsed.DataSet["diffgr:diffgram"][0]
                .NewDataSet[0].Table) {
                if (!(stop.codice_fermata[0] in stops)) {
                    stops[stop.codice_fermata[0]] = {
                        coordX: stop.coordinata_x[0],
                        coordY: stop.coordinata_y[0],
                        stopName: stop.denominazione[0],
                        routes: [stop.codice_linea][0]
                    };
                } else {
                    if (
                        !stops[stop.codice_fermata[0]].routes.includes(
                            stop.codice_linea[0]
                        )
                    ) {
                        stops[stop.codice_fermata[0]].routes.push(
                            stop.codice_linea[0]
                        );
                    }
                }
            }

            logger.info("Fermate TPER caricate");
            Tper.fermate = Object.entries(stops).map(
                e =>
                    ({
                        stopId: e[0],
                        stopName: e[1].stopName,
                        coordX: e[1].coordX,
                        coordY: e[1].coordY,
                        routes: e[1].routes
                    } as TperStop)
            );
            Tper.cacheDate = moment();
            logger.info("TPER cache created at " + Tper.cacheDate.format());
            // writeFileSync(
            //     join(cwd(), "./tper.json"),
            //     JSON.stringify(Tper.fermate, null, 4)
            // );
            Tper.isCaching = false;
            return true;
        } catch (err) {
            logger.error("Error while reading TPER stops");
            logger.error(err);
            Tper.isCaching = false;
            return false;
        }
    }

    private static _isCacheOutdated(): boolean {
        return (
            !Tper._fermate ||
            !Tper.cacheDate ||
            moment().diff(Tper.cacheDate, "days") > 3
        );
    }

    public async cercaFermata(stopId: string): Promise<TperStop | null> {
        // logger.debug("Cerco fermata TPER " + stopId);
        if (Tper._isCacheOutdated()) {
            const res = await Tper._cacheStops();
            if (!res) return null;
        }

        return (
            (Tper.fermate as TperStop[]).find(s => s.stopId === stopId) || null
        );
    }

    public async cercaFermatePerNome(
        nome: string
    ): Promise<Fuse.FuseResult<TperStop>[]> {
        if (Tper._isCacheOutdated()) {
            const res = await Tper._cacheStops();
            if (!res) {
                logger.error("Errore fuzzy search TPER return []");
                return [];
            }
        }

        logger.debug("Cerco fermata fuzzy " + nome);

        const options = {
            includeScore: true,
            keys: [
                {
                    name: "stopName",
                    weight: 0.3
                },
                {
                    name: "stopId",
                    weight: 0.7
                }
            ],
            shouldSort: false
        };

        const fuse = new Fuse(Tper.fermate as TperStop[], options);

        return fuse.search(nome);
    }

    private static _mapToNews(items: Item[]): News[] {
        const newsList: News[] = [];

        items.forEach(item => {
            const news: News = {
                title: item.title || "-- DEBUG --",
                agency: "tper",
                date: moment(item.isoDate),
                type: item.categories?.[0] || "Uncategorized",
                url: item.link
            };
            newsList.push(news);
        });

        return newsList;
    }

    public async getNews(): Promise<News[] | null> {
        if (
            !Tper.newsCache ||
            !Tper.newsCacheDate ||
            moment().diff(Tper.newsCacheDate, "minutes") > 10
        ) {
            logger.info("Carico news TPER");
            try {
                // TPER fatta sempre bene, certificato non valido
                const data = await fetchUrlWithCurl(Tper.newsUrl);
                // DEBUG

                if (!data) return null;

                const feed = await rssParser.parseString(data);

                const news = Tper._mapToNews(feed.items);

                Tper.newsCache = news;
                Tper.newsCacheDate = moment();

                logger.info("TPER fetched " + news.length + " news");

                return news;
            } catch (err) {
                logger.error("Error while reading TPER news");
                logger.error(err);
                return null;
            }
        } else {
            logger.debug("News TPER da cache");
            return Tper.newsCache;
        }
    }
}

export default Tper;
