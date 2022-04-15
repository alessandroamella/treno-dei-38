import axios from "axios";
import { logger } from "../logger";
import OutputFormattato from "./OutputFormattato";
import StatoTreno from "./StatoTreno";
import Stazione from "./Stazione";
import TrenoTabellone from "./TrenoTabellone";

class Trenitalia {
    readonly numeroTreno: string;

    private stazionePartenza: string | null = null;
    private dataPartezaMs: string | null = null;

    constructor(numeroTreno: string) {
        this.numeroTreno = numeroTreno;
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
                    "http://www.viaggiatreno.it/viaggiatrenonew/resteasy/viaggiatreno/cercaNumeroTrenoTrenoAutocomplete/" +
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

        const [numeroTreno, stazionePartenza, dataPartenzaMs] = (data as string)
            .trim()
            .split("|")[1]
            .split("-");

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
            `http://www.viaggiatreno.it/viaggiatrenonew/resteasy/viaggiatreno/andamentoTreno/${this.stazionePartenza}/${this.numeroTreno}/${this.dataPartezaMs}`
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
                `http://www.viaggiatreno.it/viaggiatrenonew/resteasy/viaggiatreno/partenze/${codiceStazione}/${new Date()}`
            );

            return (data as StatoTreno[])
                .map(e => ({
                    ...Trenitalia.formattaOutput(e),
                    orarioArrivo: e.compOrarioPartenza
                }))
                .map(({ origine, ...rest }) => rest)
                .filter(e => e.treno.toLowerCase().includes("reg"));
        } catch (err) {
            logger.error("Errore nel caricamento tabellone");
            logger.error(err);
            return null;
        }
    }

    public static formattaOutput(statoTreno: StatoTreno): OutputFormattato {
        return {
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
                "http://www.viaggiatreno.it/viaggiatrenonew/resteasy/viaggiatreno/autocompletaStazione/" +
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
}

export default Trenitalia;
