import axios from "axios";
import moment, { Moment } from "moment-timezone";
import { logger } from "../utils/logger";
import { parseStringPromise } from "xml2js";
import Corsa from "../interfaces/Corsa";
import Stop from "../Seta/Stop";
import Fuse from "fuse.js";
import { TperNewsItem, rssParser } from "./News";
import { fetchUrlWithCurl } from "../utils/curlFetch";
import News from "../interfaces/News";
import {
    Route as GTFSRoute,
    Trip as GTFSTrip,
    Stop as GTFSStop,
    StopTime as GTFSStopTime,
    CalendarDates as GTFSCalendarDates
} from "gtfs-types";
import JSZip from "jszip";
import fs from "fs";
import path from "path";
import { writeFile } from "fs/promises";
import CsvParser from "../utils/CsvParser";
import { getRouteNameException } from "./RouteNameExceptions";

interface GTFS {
    routes: GTFSRoute[];
    trips: GTFSTrip[];
    stops: GTFSStop[];
    stop_times: GTFSStopTime[];
    calendar_dates: GTFSCalendarDates[];
}

interface CustomErr {
    msg: string;
    status: number;
}

interface FnErr {
    err: CustomErr;
}

interface OpenDataTable {
    $: {
        "diffgr:id": string;
        "msdata:rowOrder": string;
    };
    nome_file: string[];
    versione: string[];
}

export interface TperStop extends Stop {
    routes: string[];
}

interface StopsObj {
    [stopId: string]: Omit<TperStop, "stopId">;
}

interface TripStops {
    stop: GTFSStop;
    scheduledTime: Moment;
    realTime?: Moment;
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

    private static gtfsBasePath = path.join(
        process.cwd(),
        "./stops/bologna-gtfs/"
    );

    private static realTimeUrl =
        "https://hellobuswsweb.tper.it/web-services/hello-bus.asmx/QueryHellobus";

    private static openDataVersionUrl =
        "https://solwsweb.tper.it/web-services/open-data.asmx/OpenDataVersione";
    private static lineeFermateUrl =
        "https://solwsweb.tper.it/web-services/open-data.asmx/OpenDataLineeFermate";

    private static newsUrl = "https://www.tper.it/taxonomy/term/33/all/rss.xml";
    private static newsCache: News[] | null = null;
    private static newsCacheDate: Moment | null = null;

    // private static gtfsCache: GTFS | null = null;
    private static gtfsCacheDate: Moment | null = null;

    private static openDataVersionCache: Moment | null = null;
    private static openDataVersionCacheDate: Moment | null = null;

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
            res = await axios.get(Tper.realTimeUrl, {
                params: {
                    fermata: stopId,
                    linea: route,
                    oraHHMM: " "
                }
            });
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

        logger.debug(
            `Carico corse TPER per fermata ${stopId} per linee ${linee.join(
                ", "
            )}`
        );

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

        const mappedToDestination = await this.associateRealTimeInfoWithGTFS(
            stopId,
            corse
        );

        logger.debug("Corse TPER restituite:");
        logger.debug(JSON.stringify(mappedToDestination, null, 2));

        return mappedToDestination;
    }

    private static async _cacheStops(): Promise<boolean> {
        try {
            if (Tper.isCaching) {
                logger.info("TPER cache already in progress");
                return false;
            }
            logger.info("Creo cache TPER...");

            Tper.isCaching = true;

            const { data } = await axios.post(Tper.lineeFermateUrl);

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
            Tper.isCaching = false;
            return true;
        } catch (err) {
            logger.error("Error while caching TPER stops");
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

    private static _mapToNews(items: TperNewsItem[]): News[] {
        const newsList: News[] = [];

        items.forEach(item => {
            const news: News = {
                title: item.title,
                agency: "tper",
                date: moment(item.isoDate),
                type: item.categories?.[0]._ || "Uncategorized",
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

                if (!data) return null;

                const feed = await rssParser.parseString(data);

                const news = Tper._mapToNews(feed.items);

                Tper.newsCache = news;
                Tper.newsCacheDate = moment();

                logger.info("TPER fetched " + news.length + " news");

                return news;
            } catch (err) {
                logger.error("Error while fetching TPER news");
                logger.error(err);
                return null;
            }
        } else {
            logger.debug("News TPER da cache");
            return Tper.newsCache;
        }
    }

    private static async fetchLatestOpenDataVersion(): Promise<Moment | null> {
        if (
            Tper.openDataVersionCache &&
            Tper.openDataVersionCacheDate &&
            moment().diff(Tper.openDataVersionCacheDate, "days") <= 1
        ) {
            logger.debug(
                "TPER open data version from cache: " +
                    Tper.openDataVersionCache
            );
            return Tper.openDataVersionCache;
        }

        logger.info("Fetching TPER latest open data version");

        let xml: string;
        let result: { [key: string]: any };
        try {
            const res = await axios.get(Tper.openDataVersionUrl);
            xml = res.data;
        } catch (err) {
            logger.error("Error while fetching TPER open data version");
            logger.error(err);
            return null;
        }

        try {
            result = await parseStringPromise(xml);
        } catch (err) {
            logger.error("Error while parsing TPER open data version");
            logger.error(err);
            return null;
        }

        const latestVersionStr = (<OpenDataTable>(
            result.DataSet["diffgr:diffgram"][0].NewDataSet[0].Table.find(
                (e: OpenDataTable) => e.nome_file[0] === "gommagtfsbo"
            )
        )).versione[0];

        const latestVersion = moment(latestVersionStr, "YYYYMMDD");

        logger.info(
            `TPER open data version: "${latestVersionStr}" (${latestVersion
                .tz("Europe/Rome")
                .format("DD/MM/YYYY")})`
        );

        Tper.openDataVersionCache = latestVersion;
        Tper.openDataVersionCacheDate = moment();

        return latestVersion;
    }

    // Helper function for getGTFSData, not to be used elsewhere
    private static async _fetchAndParseGTFSData(force = false): Promise<null> {
        if (
            !force &&
            // Tper.gtfsCache &&
            Tper.gtfsCacheDate &&
            moment().diff(Tper.gtfsCacheDate, "days") <= 1
        ) {
            logger.debug("TPER GTFS data already updated, not fetching");
            // return Tper.gtfsCache;
            return null;
        }

        logger.info("Fetching TPER GTFS data in _fetchAndParseGTFSData");

        const latestDate = await Tper.fetchLatestOpenDataVersion();

        if (!latestDate) {
            logger.error("No latest date in _fetchAndParseGTFSData");
            return null;
        }

        const url = `https://solweb.tper.it/web/tools/open-data/open-data-download.aspx?source=solweb.tper.it&filename=gommagtfsbo&version=${latestDate
            ?.tz("Europe/Rome")
            .format("YYYYMMDD")}&format=zip`;

        logger.debug("Fetching TPER GTFS data from " + url);

        const response = await axios.get(url, { responseType: "arraybuffer" });

        logger.debug("TPER GTFS data fetched from " + url);

        const zip = await JSZip.loadAsync(response.data);

        // const gtfsCache: GTFS = {
        //     routes: undefined,
        //     trips: undefined,
        //     stops: undefined,
        //     stop_times: undefined,
        //     calendar_dates: undefined
        // };

        const files = {
            routes: "routes.txt",
            trips: "trips.txt",
            stops: "stops.txt",
            stop_times: "stop_times.txt",
            calendar_dates: "calendar_dates.txt"
        };

        for (const key in files) {
            logger.debug(
                "Parsing TPER GTFS file " + files[<keyof typeof files>key]
            );

            const file = files[<keyof typeof files>key];
            const content = await zip.file(file)?.async("string");
            if (!content) {
                logger.error("No content in TPER GTFS parse for file " + file);
                return null;
            }

            const parsedData = await CsvParser.parseAsync(content, {
                columns: true,
                delimiter: ",",
                trim: true
            });

            // gtfsCache[<keyof typeof files>key] = parsedData;

            logger.debug(
                "Parsed TPER GTFS file " + files[<keyof typeof files>key]
            );

            const jsonFile = file.replace(".txt", ".json");
            await writeFile(
                path.join(Tper.gtfsBasePath, jsonFile),
                JSON.stringify(parsedData, null, 2)
            );
        }

        // Tper.gtfsCache = gtfsCache;
        Tper.gtfsCacheDate = moment();
        // return gtfsCache;

        return null;
    }

    private async getGTFSData<K extends keyof GTFS>(
        datum: K
    ): Promise<GTFS[K] | null> {
        await Tper._fetchAndParseGTFSData();

        const p = path.join(Tper.gtfsBasePath, datum + ".json");

        if (!fs.existsSync(p)) {
            logger.error("No GTFS file in getGTFSData");
            return null;
        }

        const gtfsStr = fs.readFileSync(p, { encoding: "utf-8" });
        let gtfsData: GTFS[K] = JSON.parse(gtfsStr);

        if (!gtfsData) {
            logger.error("No GTFS data in getGTFSData");
            return null;
        }

        // Fix gtfs route TPER name exceptions
        if (datum === "trips" || datum === "routes") {
            gtfsData = (gtfsData as (GTFSTrip | GTFSRoute)[]).map(e => ({
                ...e,
                route_id: getRouteNameException(e.route_id)
            })) as GTFS[K];
        }

        logger.debug("GTFS data fetched for " + datum);

        return gtfsData || null;

        // try {
        //     const f = await readFile(
        //         path.join(Tper.gtfsBasePath, datum + ".json"),
        //         { encoding: "utf-8" }
        //     );

        //     const obj = JSON.parse(f);

        //     if (!Array.isArray(obj) || obj.some(s => !s)) {
        //         throw new Error(`Invalid ${datum} obj in getGTFSData: ${f}`);
        //     }

        //     return obj as GTFSStopTime[];
        // } catch (err) {
        //     logger.error("Error while reading GTFS " + datum);
        //     logger.error(err);
        //     return null;
        // }
    }

    private async findClosestGTFSTrip(
        realTimeData: Corsa,
        stopId: string,
        _gtfsTrips: GTFSTrip[],
        _gtfsStopTimes: GTFSStopTime[]
    ): Promise<[trip: GTFSTrip, gtfsArrival: Moment] | null> {
        let minDifference = Infinity;
        let closestTrip: GTFSTrip | null = null;
        let gtfsArrival: Moment | null = null;

        const arrivalTime = moment(
            realTimeData.arrivoTempoReale || realTimeData.arrivoProgrammato,
            "HH:mm"
        );

        logger.debug(
            `Finding closest GTFS trip for TPER trip ${realTimeData.linea} at ${
                realTimeData.arrivoTempoReale || realTimeData.arrivoProgrammato
            }`
        );

        const gtfsTrips = _gtfsTrips?.filter(t =>
            [
                t.route_id,
                t.route_id + t.trip_headsign,
                t.trip_short_name
            ].includes(getRouteNameException(realTimeData.linea))
        );
        const stopTimes = _gtfsStopTimes?.filter(st => st.stop_id === stopId);

        if (!gtfsTrips || !stopTimes) {
            logger.warn(
                `No GTFS data in findClosestGTFSTrip for trip ${
                    realTimeData.linea
                } (${getRouteNameException(realTimeData.linea)}`
            );

            return null;
        }

        gtfsTrips.forEach(trip => {
            const stopTime = stopTimes.find(st => st.trip_id === trip.trip_id);

            if (stopTime) {
                const _gtfsArrival = moment(stopTime.arrival_time, "HH:mm:ss");

                const difference = Math.abs(
                    arrivalTime.diff(_gtfsArrival, "minutes")
                );
                if (difference < minDifference) {
                    minDifference = difference;
                    closestTrip = trip;
                    gtfsArrival = _gtfsArrival;
                }
            }
        });

        if (closestTrip) {
            logger.debug(
                `TPER trip ${realTimeData.linea} at ${
                    realTimeData.arrivoTempoReale ||
                    realTimeData.arrivoProgrammato
                } has closest GTFS trip ${
                    (closestTrip as GTFSTrip)?.trip_id
                } at ${moment(
                    stopTimes.find(st => st.trip_id === closestTrip?.trip_id)
                        ?.arrival_time,
                    "HH:mm:ss"
                ).format("HH:mm")}`
            );
        } else {
            logger.debug(
                `TPER trip ${realTimeData.linea} at ${
                    realTimeData.arrivoTempoReale ||
                    realTimeData.arrivoProgrammato
                } has NO closest GTFS trip`
            );
        }

        return closestTrip && gtfsArrival ? [closestTrip, gtfsArrival] : null;
    }

    private getLatestStopTimeForTrip(
        trip: GTFSTrip,
        stopTimes: GTFSStopTime[]
    ): GTFSStopTime | null {
        const lastStopTime = stopTimes.filter(
            st => st.trip_id === trip.trip_id
        );

        if (!lastStopTime.length) return null;

        lastStopTime.sort((a, b) => a.stop_sequence - b.stop_sequence);

        return lastStopTime[lastStopTime.length - 1] || null;
    }

    private async getStopFromStopTime(
        stopTime: GTFSStopTime
    ): Promise<GTFSStop | null> {
        const lastStop = await this.getGTFSData("stops").then(stops =>
            stops?.find(stop => stop.stop_id === stopTime.stop_id)
        );

        return lastStop || null;
    }

    public async associateRealTimeInfoWithGTFS(
        stopId: string,
        realTimeData: Corsa[]
    ): Promise<Corsa[]> {
        const gtfsTrips = await this.getGTFSData("trips");
        const gtfsStopTimes = await this.getGTFSData("stop_times");
        const gtfsStops = await this.getGTFSData("stops");

        const promises = realTimeData.map(async tripData => {
            logger.debug(
                "Associating GTFS data with TPER data for trip of line " +
                    tripData.linea
            );

            if (!gtfsTrips || !gtfsStopTimes || !gtfsStops) {
                logger.warn(
                    "No GTFS data in associateRealTimeInfoWithGTFS for trip " +
                        tripData.linea
                );
                return tripData;
            }

            const closestTripAndDistance = await this.findClosestGTFSTrip(
                tripData,
                stopId,
                gtfsTrips,
                gtfsStopTimes
            );

            let gtfsArrival: Moment | null = null;

            if (closestTripAndDistance) {
                const [associatedGTFSTrip, _gtfsArrival] =
                    closestTripAndDistance;
                gtfsArrival = _gtfsArrival;

                const lastStopTime = this.getLatestStopTimeForTrip(
                    associatedGTFSTrip,
                    gtfsStopTimes
                );

                if (!lastStopTime)
                    throw new Error(
                        "No lastStopTime in associateRealTimeInfoWithGTFS"
                    );

                const lastStop = await this.getStopFromStopTime(lastStopTime);

                tripData.trip = associatedGTFSTrip;
                tripData.destinazione =
                    // associatedGTFSTrip.trip_headsign ||
                    lastStop?.stop_name || null;
                tripData.arrivoProgrammato = gtfsArrival
                    // .tz("Europe/Rome")
                    .format("HH:mm");
            }

            logger.debug(
                `TPER trip ${tripData.linea} at ${
                    tripData.arrivoTempoReale || tripData.arrivoProgrammato
                } has destination "${tripData.destinazione}" and arrival time ${
                    gtfsArrival?.format("HH:mm")
                    // ?.tz("Europe/Rome")
                }`
            );

            return tripData;
        });

        return Promise.all(promises);
    }

    public async caricaFermateDaTrip(
        gtfsTripId: string,
        minutesDelay: number
    ): Promise<TripStops[] | null> {
        const gtfsStopTimes = await this.getGTFSData("stop_times");
        const gtfsStops = await this.getGTFSData("stops");

        if (!gtfsStopTimes || !gtfsStops) {
            logger.warn(
                "No GTFS data in caricaFermateDaTrip for trip " + gtfsTripId
            );
            return null;
        }

        const stopTimes = gtfsStopTimes.filter(st => st.trip_id === gtfsTripId);

        const stops: TripStops[] = [];

        for (const stopTime of stopTimes) {
            const stop = gtfsStops.find(s => s.stop_id === stopTime.stop_id);

            if (!stop) {
                logger.warn(
                    "No stop in caricaFermateDaTrip for trip " +
                        gtfsTripId +
                        " and stop " +
                        stopTime.stop_id
                );
                continue;
            }

            const stopTimeMoment = moment(stopTime.arrival_time, "HH:mm:ss");
            const realTimeMoment = stopTimeMoment.add(minutesDelay, "minutes");

            stops.push({
                stop,
                scheduledTime: stopTimeMoment,
                realTime: realTimeMoment
            });
        }

        return stops;
    }

    /**
     * Force reloads both stops and GTFS data
     */
    public static async forceReloadCache() {
        logger.info("TPER force reloading cache");
        await Tper._fetchAndParseGTFSData(true);
        await Tper._cacheStops();
        logger.info("TPER cache reloaded");
    }
}

export default Tper;
