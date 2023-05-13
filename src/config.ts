import fs from "fs";
import { join } from "path";
import { cwd } from "process";
import { logger } from "./utils/logger";

if (!fs.existsSync(join(cwd(), "stops"))) {
    logger.info("mkDir stops at " + cwd() + "/stops");
    fs.mkdirSync(join(cwd(), "stops"));
}

if (!fs.existsSync(join(cwd(), "stops", "bologna-gtfs"))) {
    logger.info("mkDir stops/bologna-gtfs at " + cwd() + "/stops/bologna-gtfs");
    fs.mkdirSync(join(cwd(), "stops", "bologna-gtfs"));
}
