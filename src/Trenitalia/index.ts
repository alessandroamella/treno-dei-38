import axios from "axios";
import { logger } from "../utils/logger";
import OutputFormattato from "./OutputFormattato";
import StatoTreno from "./StatoTreno";
import Stazione from "./Stazione";
import TrenoTabellone from "../interfaces/TrenoTabellone";
import moment, { Moment } from "moment";
import { TrenitaliaNewsItem, rssParser } from "./News";
import News from "../interfaces/News";

class Trenitalia {
    readonly numeroTreno: string;
    readonly idOrigine?: string;

    private stazionePartenza: string | null = null;
    private dataPartezaMs: string | null = null;

    private static newsUrl =
        "https://www.rfi.it/it/news-e-media/infomobilita.rss.updates.emilia_romagna.xml";
    private static newsCache: News[] | null = null;
    private static newsCacheDate: Moment | null = null;

    constructor(numeroTreno: string, idOrigine?: string) {
        this.numeroTreno = numeroTreno;
        this.idOrigine = idOrigine;
    }

    public static isStatoTreno = (v: unknown): v is StatoTreno => {
        return (
            !!v && typeof v === "object" && Array.isArray((v as any).fermate)
        );
    };

    public async caricaDatiTreno(): Promise<boolean> {
        if (this.stazionePartenza && this.dataPartezaMs) {
            logger.warn("caricaDatiTreno dati già caricati");
            return true;
        }

        let data;
        try {
            data = (
                await axios.get(
                    "http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/cercaNumeroTrenoTrenoAutocomplete/" +
                        this.numeroTreno
                )
            ).data;
        } catch (err) {
            if (axios.isAxiosError(err)) {
                logger.warn(err?.response?.data || err);
            }
            logger.error(err);
            return false;
        }

        if (!data) {
            logger.error(
                "Errore nel caricamento dati treno " + this.numeroTreno
            );
            return false;
        }

        const risultati = (data as string).trim().split("\n");
        const mapped = risultati
            .map(r => r.split("|")[1].split("-").slice(1))
            .map(r => ({
                stazionePartenza: r[0],
                dataPartenzaMs: r[1]
            }));

        const { stazionePartenza, dataPartenzaMs } =
            (this.idOrigine &&
                mapped.find(e => e.stazionePartenza === this.idOrigine)) ||
            mapped[0];

        this.stazionePartenza = stazionePartenza;
        this.dataPartezaMs = dataPartenzaMs;

        return true;
    }
    /**
     * Bisogna avere prima chiamato e atteso caricaDatiTreno()
     */
    public async caricaInfoViaggio(): Promise<StatoTreno | null> {
        if (!this.stazionePartenza || !this.dataPartezaMs) {
            logger.error(
                "Bisogna chiamare caricaDatiTreno() prima di invocare caricaInfoViaggio()"
            );
        }

        const { data } = await axios.get(
            `http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/andamentoTreno/${this.stazionePartenza}/${this.numeroTreno}/${this.dataPartezaMs}`
        );

        if (!Trenitalia.isStatoTreno(data)) {
            logger.error(
                "Errore nel caricamento info viaggio del treno " +
                    this.numeroTreno
            );
            return null;
        }

        return data;
    }

    public static async tabellone(
        codiceStazione: string
    ): Promise<TrenoTabellone[] | null> {
        try {
            const { data } = await axios.get(
                `http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/partenze/${codiceStazione}/${new Date()}`
            );

            return (data as StatoTreno[])
                .map(e => ({
                    ...Trenitalia.formattaOutput(e),
                    orarioArrivo: e.orarioPartenza,
                    idOrigine: e.codOrigine
                }))
                .map(({ origine, ...rest }) => rest);
            // SOLO REGIONALI
            // .filter(e => e.treno.toLowerCase().includes("reg"));
        } catch (err) {
            logger.error("Errore nel caricamento tabellone");
            logger.error(err);
            return null;
        }
    }

    public static formattaOutput(statoTreno: StatoTreno): OutputFormattato {
        return {
            numero: statoTreno.numeroTreno,
            treno: statoTreno.compNumeroTreno,
            origine: statoTreno.origine,
            destinazione: statoTreno.destinazione,
            fermate: statoTreno.fermate?.map(f => ({
                stazione: f.stazione,
                id: f.id,
                dataProgrammata: f.partenza_teorica || f.programmata,
                dataEffettiva: f.partenzaReale || f.arrivoReale,
                transitato: f.actualFermataType.toString() === "1"
            })),
            ritardo: statoTreno.ritardo,
            oraUltimoRilevamento: statoTreno.oraUltimoRilevamento,
            stazioneUltimoRilevamento:
                statoTreno.stazioneUltimoRilevamento !== "--"
                    ? statoTreno.stazioneUltimoRilevamento
                    : null
        };
    }

    public static async stazionePerNome(
        nome: string
    ): Promise<Stazione[] | null> {
        try {
            const { data } = await axios.get(
                "http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/autocompletaStazione/" +
                    nome
            );

            const stazioni = (data as string)
                .trim()
                .split("\n")
                .map(s => s.trim().split("|"));
            return stazioni.map(s => ({ nome: s[0], id: s[1] }));
        } catch (err) {
            logger.error("Errore nella ricerca stazione");
            logger.error(err);

            return null;
        }
    }

    public static async getNews(): Promise<News[] | null> {
        if (
            !Trenitalia.newsCache ||
            !Trenitalia.newsCacheDate ||
            moment().diff(Trenitalia.newsCacheDate, "minutes") > 10
        ) {
            logger.info("Carico news Trenitalia");
            try {
                // Trenitalia fatta sempre bene, certificato non valido
                const { data } = await axios.get(Trenitalia.newsUrl);
                // DEBUG

                if (!data) return null;

                const feed = await rssParser.parseString(data);

                const news = Trenitalia._mapToNews(feed.items);

                Trenitalia.newsCache = news;
                Trenitalia.newsCacheDate = moment();

                logger.info("Trenitalia fetched " + news.length + " news");

                return news;
            } catch (err) {
                logger.error("Error while reading Trenitalia news");
                logger.error(err);
                return null;
            }
        } else {
            logger.debug("News Trenitalia da cache");
            return Trenitalia.newsCache;
        }
    }

    private static _mapToNews(items: TrenitaliaNewsItem[]): News[] {
        const news: News[] = items
            .filter(item => item.title !== undefined)
            .map(item => ({
                title: item.title!,
                agency: "trenitalia",
                date: moment(item.pubDate),
                type: "Infomobilità",
                url: item.link
            }));

        return news;
    }
}

export default Trenitalia;
