import Parser, { Item } from "rss-parser";

type FerrovieNewsFeed = {};

export interface FerrovieNewsItem extends Item {
    category: string;
}

export const rssParser = new Parser<FerrovieNewsFeed, FerrovieNewsItem>({
    customFields: {
        feed: [],
        item: ["title", "link", "pubDate", "guid", "category"]
    }
});
