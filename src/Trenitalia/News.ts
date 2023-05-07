import Parser, { Output, Item } from "rss-parser";

type TrenitaliaNewsFeed = {};

export interface TrenitaliaNewsItem extends Item {
    "rfi:region": string;
}

export const rssParser = new Parser<TrenitaliaNewsFeed, TrenitaliaNewsItem>({
    customFields: {
        feed: [],
        item: ["title", "link", "pubDate", "guid", "rfi:region"]
    }
});
