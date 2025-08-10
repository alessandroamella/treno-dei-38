import Database from 'better-sqlite3';
import path from 'path';
import { logger } from './logger';
import {
    Route as GTFSRoute,
    Trip as GTFSTrip,
    Stop as GTFSStop,
    StopTime as GTFSStopTime,
    CalendarDates as GTFSCalendarDates
} from "gtfs-types";

export interface GTFS {
    routes: GTFSRoute[];
    trips: GTFSTrip[];
    stops: GTFSStop[];
    stop_times: GTFSStopTime[];
    calendar_dates: GTFSCalendarDates[];
}

export class GTFSDatabase {
    private static instance: GTFSDatabase;
    private db: Database.Database;
    private dbPath: string;

    private constructor() {
        this.dbPath = path.join(process.cwd(), 'data/tper-gtfs.sqlite');
        this.db = new Database(this.dbPath);
        this.initializeTables();
    }

    public static getInstance(): GTFSDatabase {
        if (!GTFSDatabase.instance) {
            GTFSDatabase.instance = new GTFSDatabase();
        }
        return GTFSDatabase.instance;
    }

    private initializeTables(): void {
        // Enable WAL mode for better performance
        this.db.pragma('journal_mode = WAL');
        
        // Create tables with proper schemas and indexes
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS routes (
                route_id TEXT PRIMARY KEY,
                agency_id TEXT,
                route_short_name TEXT,
                route_long_name TEXT,
                route_desc TEXT,
                route_type INTEGER,
                route_url TEXT,
                route_color TEXT,
                route_text_color TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_route_short_name ON routes(route_short_name);
            CREATE INDEX IF NOT EXISTS idx_route_long_name ON routes(route_long_name);

            CREATE TABLE IF NOT EXISTS trips (
                route_id TEXT NOT NULL,
                service_id TEXT NOT NULL,
                trip_id TEXT PRIMARY KEY,
                trip_headsign TEXT,
                trip_short_name TEXT,
                direction_id INTEGER,
                block_id TEXT,
                shape_id TEXT,
                wheelchair_accessible INTEGER,
                bikes_allowed INTEGER
            );
            CREATE INDEX IF NOT EXISTS idx_trip_route_id ON trips(route_id);
            CREATE INDEX IF NOT EXISTS idx_trip_service_id ON trips(service_id);
            CREATE INDEX IF NOT EXISTS idx_trip_headsign ON trips(trip_headsign);

            CREATE TABLE IF NOT EXISTS stops (
                stop_id TEXT PRIMARY KEY,
                stop_code TEXT,
                stop_name TEXT NOT NULL,
                stop_desc TEXT,
                stop_lat REAL NOT NULL,
                stop_lon REAL NOT NULL,
                zone_id TEXT,
                stop_url TEXT,
                location_type INTEGER,
                parent_station TEXT,
                stop_timezone TEXT,
                wheelchair_boarding INTEGER
            );
            CREATE INDEX IF NOT EXISTS idx_stop_name ON stops(stop_name);
            CREATE INDEX IF NOT EXISTS idx_stop_code ON stops(stop_code);
            CREATE INDEX IF NOT EXISTS idx_stop_location ON stops(stop_lat, stop_lon);

            CREATE TABLE IF NOT EXISTS stop_times (
                trip_id TEXT NOT NULL,
                arrival_time TEXT NOT NULL,
                departure_time TEXT NOT NULL,
                stop_id TEXT NOT NULL,
                stop_sequence INTEGER NOT NULL,
                stop_headsign TEXT,
                pickup_type INTEGER,
                drop_off_type INTEGER,
                shape_dist_traveled REAL,
                timepoint INTEGER,
                PRIMARY KEY (trip_id, stop_sequence)
            );
            CREATE INDEX IF NOT EXISTS idx_stop_times_trip_id ON stop_times(trip_id);
            CREATE INDEX IF NOT EXISTS idx_stop_times_stop_id ON stop_times(stop_id);
            CREATE INDEX IF NOT EXISTS idx_stop_times_arrival ON stop_times(arrival_time);
            CREATE INDEX IF NOT EXISTS idx_stop_times_sequence ON stop_times(stop_sequence);

            CREATE TABLE IF NOT EXISTS calendar_dates (
                service_id TEXT NOT NULL,
                date TEXT NOT NULL,
                exception_type INTEGER NOT NULL,
                PRIMARY KEY (service_id, date)
            );
            CREATE INDEX IF NOT EXISTS idx_calendar_date ON calendar_dates(date);
            CREATE INDEX IF NOT EXISTS idx_calendar_service_id ON calendar_dates(service_id);
        `);

        logger.debug('GTFS SQLite database tables initialized');
    }

    public beginTransaction(): Database.Transaction {
        return this.db.transaction(() => {
            // This will be filled by the actual operations
        });
    }

    public insertRoutes(routes: GTFSRoute[]): void {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO routes (
                route_id, agency_id, route_short_name, route_long_name,
                route_desc, route_type, route_url, route_color, route_text_color
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertMany = this.db.transaction((routes: GTFSRoute[]) => {
            for (const route of routes) {
                stmt.run(
                    route.route_id,
                    route.agency_id || null,
                    route.route_short_name || null,
                    route.route_long_name || null,
                    route.route_desc || null,
                    route.route_type || null,
                    route.route_url || null,
                    route.route_color || null,
                    route.route_text_color || null
                );
            }
        });

        insertMany(routes);
        logger.debug(`Inserted ${routes.length} routes into SQLite database`);
    }

    public insertTrips(trips: GTFSTrip[]): void {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO trips (
                route_id, service_id, trip_id, trip_headsign, trip_short_name,
                direction_id, block_id, shape_id, wheelchair_accessible, bikes_allowed
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertMany = this.db.transaction((trips: GTFSTrip[]) => {
            for (const trip of trips) {
                stmt.run(
                    trip.route_id,
                    trip.service_id,
                    trip.trip_id,
                    trip.trip_headsign || null,
                    trip.trip_short_name || null,
                    trip.direction_id || null,
                    trip.block_id || null,
                    trip.shape_id || null,
                    trip.wheelchair_accessible || null,
                    trip.bikes_allowed || null
                );
            }
        });

        insertMany(trips);
        logger.debug(`Inserted ${trips.length} trips into SQLite database`);
    }

    public insertStops(stops: GTFSStop[]): void {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO stops (
                stop_id, stop_code, stop_name, stop_desc, stop_lat, stop_lon,
                zone_id, stop_url, location_type, parent_station, stop_timezone, wheelchair_boarding
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertMany = this.db.transaction((stops: GTFSStop[]) => {
            for (const stop of stops) {
                stmt.run(
                    stop.stop_id,
                    stop.stop_code || null,
                    stop.stop_name,
                    stop.stop_desc || null,
                    stop.stop_lat,
                    stop.stop_lon,
                    stop.zone_id || null,
                    stop.stop_url || null,
                    stop.location_type || null,
                    stop.parent_station || null,
                    stop.stop_timezone || null,
                    stop.wheelchair_boarding || null
                );
            }
        });

        insertMany(stops);
        logger.debug(`Inserted ${stops.length} stops into SQLite database`);
    }

    public insertStopTimes(stopTimes: GTFSStopTime[]): void {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO stop_times (
                trip_id, arrival_time, departure_time, stop_id, stop_sequence,
                stop_headsign, pickup_type, drop_off_type, shape_dist_traveled, timepoint
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertMany = this.db.transaction((stopTimes: GTFSStopTime[]) => {
            for (const stopTime of stopTimes) {
                stmt.run(
                    stopTime.trip_id,
                    stopTime.arrival_time,
                    stopTime.departure_time,
                    stopTime.stop_id,
                    stopTime.stop_sequence,
                    stopTime.stop_headsign || null,
                    stopTime.pickup_type || null,
                    stopTime.drop_off_type || null,
                    stopTime.shape_dist_traveled || null,
                    stopTime.timepoint || null
                );
            }
        });

        insertMany(stopTimes);
        logger.debug(`Inserted ${stopTimes.length} stop times into SQLite database`);
    }

    public insertCalendarDates(calendarDates: GTFSCalendarDates[]): void {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO calendar_dates (service_id, date, exception_type)
            VALUES (?, ?, ?)
        `);

        const insertMany = this.db.transaction((calendarDates: GTFSCalendarDates[]) => {
            for (const calendarDate of calendarDates) {
                stmt.run(
                    calendarDate.service_id,
                    calendarDate.date,
                    calendarDate.exception_type
                );
            }
        });

        insertMany(calendarDates);
        logger.debug(`Inserted ${calendarDates.length} calendar dates into SQLite database`);
    }

    // Query methods
    public findStopById(stopId: string): GTFSStop | null {
        const stmt = this.db.prepare('SELECT * FROM stops WHERE stop_id = ?');
        const stop = stmt.get(stopId) as GTFSStop | undefined;
        return stop || null;
    }

    public findStopsByName(name: string): GTFSStop[] {
        const stmt = this.db.prepare('SELECT * FROM stops WHERE stop_name LIKE ? ORDER BY stop_name');
        return stmt.all(`%${name}%`) as GTFSStop[];
    }

    public findTripsByRouteId(routeId: string): GTFSTrip[] {
        const stmt = this.db.prepare('SELECT * FROM trips WHERE route_id = ?');
        return stmt.all(routeId) as GTFSTrip[];
    }

    public findTripsByRouteIds(routeIds: string[]): GTFSTrip[] {
        if (routeIds.length === 0) return [];
        const placeholders = routeIds.map(() => '?').join(',');
        const stmt = this.db.prepare(`SELECT * FROM trips WHERE route_id IN (${placeholders})`);
        return stmt.all(...routeIds) as GTFSTrip[];
    }

    public findStopTimesForTrip(tripId: string): GTFSStopTime[] {
        const stmt = this.db.prepare('SELECT * FROM stop_times WHERE trip_id = ? ORDER BY stop_sequence ASC');
        return stmt.all(tripId) as GTFSStopTime[];
    }

    public findStopTimesForStop(stopId: string): GTFSStopTime[] {
        const stmt = this.db.prepare('SELECT * FROM stop_times WHERE stop_id = ? ORDER BY arrival_time ASC');
        return stmt.all(stopId) as GTFSStopTime[];
    }

    public findRouteById(routeId: string): GTFSRoute | null {
        const stmt = this.db.prepare('SELECT * FROM routes WHERE route_id = ?');
        const route = stmt.get(routeId) as GTFSRoute | undefined;
        return route || null;
    }

    public findLastStopForTrip(tripId: string): GTFSStop | null {
        const stmt = this.db.prepare(`
            SELECT s.* FROM stops s
            JOIN stop_times st ON s.stop_id = st.stop_id
            WHERE st.trip_id = ?
            ORDER BY st.stop_sequence DESC
            LIMIT 1
        `);
        const stop = stmt.get(tripId) as GTFSStop | undefined;
        return stop || null;
    }

    public getAllStops(): GTFSStop[] {
        const stmt = this.db.prepare('SELECT * FROM stops ORDER BY stop_name');
        return stmt.all() as GTFSStop[];
    }

    public getAllRoutes(): GTFSRoute[] {
        const stmt = this.db.prepare('SELECT * FROM routes ORDER BY route_short_name');
        return stmt.all() as GTFSRoute[];
    }

    public getAllTrips(): GTFSTrip[] {
        const stmt = this.db.prepare('SELECT * FROM trips ORDER BY trip_id');
        return stmt.all() as GTFSTrip[];
    }

    public getAllStopTimes(): GTFSStopTime[] {
        const stmt = this.db.prepare('SELECT * FROM stop_times ORDER BY trip_id, stop_sequence');
        return stmt.all() as GTFSStopTime[];
    }

    public getAllCalendarDates(): GTFSCalendarDates[] {
        const stmt = this.db.prepare('SELECT * FROM calendar_dates ORDER BY service_id, date');
        return stmt.all() as GTFSCalendarDates[];
    }

    public clearAllTables(): void {
        const clearTransaction = this.db.transaction(() => {
            this.db.exec(`
                DELETE FROM routes;
                DELETE FROM trips;
                DELETE FROM stops;
                DELETE FROM stop_times;
                DELETE FROM calendar_dates;
            `);
        });
        clearTransaction();
        logger.debug('Cleared all GTFS tables');
    }

    public close(): void {
        this.db.close();
    }

    public getDatabasePath(): string {
        return this.dbPath;
    }
}

export default GTFSDatabase;
