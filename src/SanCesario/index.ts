import axios from 'axios';
import moment, { type Moment } from 'moment';
import type News from '../interfaces/News';
import { logger } from '../utils/logger';

/**
 * Interface for the news items returned by the San Cesario (Plone) API.
 */
interface PloneNewsItem {
    '@id': string;
    title: string;
    description: string;
    effective: string | null; // The publication date
    created: string; // The creation date, used as a fallback
}

/**
 * Interface for the full API response from a Plone content endpoint.
 */
interface PloneApiResponse {
    items: PloneNewsItem[];
    // ... other properties of the response exist but are not needed.
}

/**
 * A class to fetch and manage news from the Comune di San Cesario sul Panaro website.
 * It aggregates news from three different categories: Notizie, Comunicati, and Avvisi.
 */
class SanCesario {
    // An array of news sources, making it easy to manage and extend.
    // The `fullobjects=1` parameter is added to ensure the API returns detailed item data, including dates.
    private static sources = [
        {
            url: 'https://www.comune.sancesariosulpanaro.mo.it/++api++/novita/notizie?fullobjects=1',
            type: 'Notizia',
        },
        {
            url: 'https://www.comune.sancesariosulpanaro.mo.it/++api++/novita/comunicati?fullobjects=1',
            type: 'Comunicato',
        },
        {
            url: 'https://www.comune.sancesariosulpanaro.mo.it/++api++/novita/avvisi?fullobjects=1',
            type: 'Avviso',
        },
    ];

    private static newsCache: News[] | null = null;
    private static newsCacheDate: Moment | null = null;
    private static readonly CACHE_DURATION_MINUTES = 10;

    /**
     * Checks if the cached data is still valid.
     */
    private static isCacheValid(): boolean {
        return (
            !!SanCesario.newsCache &&
            !!SanCesario.newsCacheDate &&
            moment().diff(SanCesario.newsCacheDate, 'minutes') <
                SanCesario.CACHE_DURATION_MINUTES
        );
    }

    /**
     * Fetches news from all sources, combines them, and sorts them by date.
     * Uses a cache to avoid excessive requests.
     * @returns A promise that resolves to an array of News items or null if an error occurs.
     */
    public static async getNews(): Promise<News[] | null> {
        if (SanCesario.isCacheValid()) {
            logger.debug('News SanCesario da cache');
            return SanCesario.newsCache;
        }

        logger.info('Carico news SanCesario da API');

        try {
            // Create an array of GET request promises for all sources.
            const promises = SanCesario.sources.map((source) =>
                axios.get<PloneApiResponse>(source.url)
            );

            // Use Promise.allSettled to fetch all sources concurrently.
            // This ensures that if one source fails, the others can still be processed.
            const results = await Promise.allSettled(promises);

            let allNews: News[] = [];

            results.forEach((result, index) => {
                const source = SanCesario.sources[index];
                if (result.status === 'fulfilled') {
                    // Check if the response contains the expected 'items' array.
                    if (result.value.data?.items) {
                        const parsedNews = SanCesario._mapJsonToNews(
                            result.value.data.items,
                            source.type
                        );
                        allNews = allNews.concat(parsedNews);
                    }
                } else {
                    // Log an error if a specific source failed to load.
                    logger.error(
                        `Error fetching news from ${source.url}`,
                        result.reason
                    );
                }
            });

            // Sort all aggregated news items by date in descending order.
            allNews.sort((a, b) => b.date.diff(a.date));

            // Update the cache with the new data.
            SanCesario.newsCache = allNews;
            SanCesario.newsCacheDate = moment();

            logger.info(
                `SanCesario fetched ${allNews.length} total news items`
            );

            return allNews;
        } catch (err) {
            logger.error(
                'A critical error occurred while fetching SanCesario news',
                err
            );
            return null;
        }
    }

    /**
     * Maps the raw JSON items from the Plone API to the standardized News interface.
     * @param items - An array of items from the API response.
     * @param type - The category of the news (e.g., 'Notizia', 'Comunicato').
     * @returns An array of formatted News items.
     */
    private static _mapJsonToNews(
        items: PloneNewsItem[],
        type: string
    ): News[] {
        if (!items) {
            return [];
        }

        return items
            .filter((item) => item?.title && item['@id'])
            .map((item) => ({
                title: item.title,
                agency: 'sancesario',
                // Use the 'effective' date if available, otherwise fall back to 'created' date.
                date: moment(item.effective || item.created),
                type: type,
                url: item['@id'],
            }));
    }
}

export default SanCesario;
