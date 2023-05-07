import Parser, { Item } from "rss-parser";

type SanCesarioNewsFeed = {};

export interface SanCesarioNewsItem extends Item {
    description: string;
    category: string;
}

export const rssParser = new Parser<SanCesarioNewsFeed, SanCesarioNewsItem>({
    customFields: {
        feed: [],
        item: ["title", "link", "pubDate", "category", "description"]
    }
});
