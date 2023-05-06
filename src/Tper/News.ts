import Parser from "rss-parser";
import { spawn } from "child_process";

type CustomFeed = {};

type CustomItem = {
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
};

export const rssParser: Parser<CustomFeed, CustomItem> = new Parser({
    customFields: {
        feed: [],
        item: [
            ["creator", "creator"],
            ["title", "title"],
            ["link", "link"],
            ["pubDate", "pubDate"],
            ["categories", "category", { keepArray: true }],
            ["content", "content"]
        ]
    }
});

export async function fetchUrlWithCurl(url: string): Promise<string | null> {
    return new Promise(resolve => {
        const curl = spawn("curl", [url]);
        let output = "";

        curl.stdout.on("data", data => {
            output += data;
        });

        curl.on("close", code => {
            if (code === 0) {
                resolve(output);
            } else {
                resolve(null);
            }
        });

        curl.on("error", () => {
            resolve(null);
        });
    });
}
