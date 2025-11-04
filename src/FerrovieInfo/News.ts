import Parser, { type Item } from 'rss-parser';

export interface FerrovieNewsItem extends Item {
    categories: string[];
}

export const rssParser = new Parser<unknown, FerrovieNewsItem>({
    customFields: {
        feed: [],
        item: ['title', 'link', 'pubDate', 'guid', 'categories'],
    },
});
