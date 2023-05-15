import axios from "axios";
import { logger } from "../utils/logger";
import moment, { Moment } from "moment";
import News from "../interfaces/News";
import { SanCesarioNewsItem, rssParser } from "./News";

class SanCesario {
    private static newsUrl =
        "http://www.comune.sancesariosulpanaro.mo.it/servizi/feed/ExpRSS_servizio.aspx?tabellaservizio=T_notizie%7ccampo=Categoria_Notizie%7cfiltrocampi=";
    private static newsCache: News[] | null = null;
    private static newsCacheDate: Moment | null = null;

    public static async getNews(): Promise<News[] | null> {
        if (
            !SanCesario.newsCache ||
            !SanCesario.newsCacheDate ||
            moment().diff(SanCesario.newsCacheDate, "minutes") > 10
        ) {
            logger.info("Carico news SanCesario");
            try {
                // SanCesario fatta sempre bene, certificato non valido
                const { data } = await axios.get(SanCesario.newsUrl);

                if (!data) return null;

                const feed = await rssParser.parseString(data);

                const news = SanCesario._mapToNews(feed.items);

                SanCesario.newsCache = news;
                SanCesario.newsCacheDate = moment();

                logger.info("SanCesario fetched " + news.length + " news");

                return news;
            } catch (err) {
                logger.error("Error while fetching SanCesario news");
                logger.error(err);
                return null;
            }
        } else {
            logger.debug("News SanCesario da cache");
            return SanCesario.newsCache;
        }
    }

    private static _mapToNews(items: SanCesarioNewsItem[]): News[] {
        const news: News[] = items
            .filter(item => item.title !== undefined)
            .map(item => ({
                title: item.title!,
                agency: "sancesario",
                date: moment(item.pubDate),
                type: item.category,
                url: item.link
            }));

        return news;
    }
}

export default SanCesario;
