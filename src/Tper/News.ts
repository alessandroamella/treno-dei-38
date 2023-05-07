import Parser, { Item } from "rss-parser";

type TperNewsFeed = {};

export interface TperNewsItem extends Omit<Item, "categories"> {
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

export const rssParser: Parser<TperNewsFeed, TperNewsItem> = new Parser({
    customFields: {
        feed: [],
        item: ["creator", "title", "link", "pubDate", "categories", "content"]
    }
});
