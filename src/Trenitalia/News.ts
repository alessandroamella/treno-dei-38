import Parser, { type Item } from 'rss-parser';

export interface TrenitaliaNewsItem extends Item {
    'rfi:region': string;
}

export const rssParser = new Parser<unknown, TrenitaliaNewsItem>({
    customFields: {
        feed: [],
        item: ['title', 'link', 'pubDate', 'guid', 'rfi:region'],
    },
});
