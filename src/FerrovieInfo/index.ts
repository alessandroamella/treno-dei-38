import axios from 'axios';
import moment, { type Moment } from 'moment';
import type News from '../interfaces/News';
import { logger } from '../utils/logger';
import printError from '../utils/printError';
import { type FerrovieNewsItem, rssParser } from './News';

class FerrovieInfo {
    private static newsUrl =
        'https://www.ferrovie.info/index.php/it/?format=feed&type=rss';
    private static newsCache: News[] | null = null;
    private static newsCacheDate: Moment | null = null;

    public static async getNews(): Promise<News[] | null> {
        if (
            !FerrovieInfo.newsCache ||
            !FerrovieInfo.newsCacheDate ||
            moment().diff(FerrovieInfo.newsCacheDate, 'minutes') > 10
        ) {
            logger.info('Carico news FerrovieInfo');
            try {
                // FerrovieInfo fatta sempre bene, certificato non valido
                const { data } = await axios.get(FerrovieInfo.newsUrl);

                if (!data) return null;

                const feed = await rssParser.parseString(data);

                const news = FerrovieInfo._mapToNews(feed.items);

                FerrovieInfo.newsCache = news;
                FerrovieInfo.newsCacheDate = moment();

                logger.info(`FerrovieInfo fetched ${news.length} news`);

                return news;
            } catch (err) {
                printError('Error while fetching FerrovieInfo news', err);
                return null;
            }
        } else {
            logger.debug('News FerrovieInfo da cache');
            return FerrovieInfo.newsCache;
        }
    }

    private static _mapToNews(items: FerrovieNewsItem[]): News[] {
        const news: News[] = items
            .filter((item) => item.title !== undefined)
            .map((item) => ({
                title: item.title!,
                agency: 'ferrovie.info',
                date: moment(item.pubDate),
                type: item.category,
                url: item.link,
            }));

        return news;
    }
}

export default FerrovieInfo;
