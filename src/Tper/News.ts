import Parser, { type Item } from 'rss-parser';

export interface TperNewsItem extends Omit<Item, 'categories'> {
    creator: string;
    title: string;
    link: string;
    pubDate: string;
    categories: {
        _: string;
        $: {
            domain: string;
        };
    }[];
    content: string;
}

export const rssParser: Parser<unknown, TperNewsItem> = new Parser({
    customFields: {
        feed: [],
        item: ['creator', 'title', 'link', 'pubDate', 'categories', 'content'],
    },
});
