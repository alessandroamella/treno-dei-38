import Parser, { type Item } from 'rss-parser';

export interface SanCesarioNewsItem extends Item {
    description: string;
    category: string;
}

export const rssParser = new Parser<unknown, SanCesarioNewsItem>({
    customFields: {
        feed: [],
        item: ['title', 'link', 'pubDate', 'category', 'description'],
    },
});
