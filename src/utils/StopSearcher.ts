import type Fuse from 'fuse.js';
import type { AgencyType, CombinedStop } from '../interfaces/AgencyType';
import type Seta from '../Seta';
import type Stop from '../Seta/Stop';
import type Tper from '../Tper';
import type { TperStop } from '../Tper';
import { logger } from './logger';

interface FindByNameArgs {
    q: string;
    removeDuplicatesByName?: boolean;
    limit?: number;
    sort?: boolean;
}

interface FindByIdArgs {
    q: string;
    agency?: AgencyType;
}

interface FindMultipleByIdsArgs {
    q: string[];
    agency?: AgencyType;
}

type StopResult = CombinedStop & { agency: AgencyType };

interface SearchedStop {
    stopName: string;
    // agency: AgencyType;
    stops: Omit<StopResult, 'stopName'>[];
}

export default class StopSearcher {
    private s: Seta;
    private t: Tper;

    constructor(s: Seta, t: Tper) {
        this.s = s;
        this.t = t;
    }

    public async findByName({
        q,
        limit,
        sort,
        removeDuplicatesByName,
    }: FindByNameArgs): Promise<SearchedStop[]> {
        const _s = await this.s.cercaFermatePerNome(q);
        const _t = await this.t.cercaFermatePerNome(q);
        let stops: Fuse.FuseResult<StopResult>[] = [
            ...(<Fuse.FuseResult<Stop & { agency: AgencyType }>[]>(
                _s.map((e) => ({ ...e, item: { ...e.item, agency: 'seta' } }))
            )),
            ...(<Fuse.FuseResult<TperStop & { agency: AgencyType }>[]>(
                _t.map((e) => ({ ...e, item: { ...e.item, agency: 'tper' } }))
            )),
        ];

        if (sort) stops.sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
        if (limit) stops = stops.slice(0, limit);

        logger.debug(`Ricerca fermata fuzzy ${stops.length} risultati:`);
        logger.debug(JSON.stringify(stops.slice(0, 3), null, 2));

        const _stops: StopResult[] = stops.map((e) => e.item);

        const _searchedStops: SearchedStop[] = [];

        for (const stop of _stops) {
            let found = false;
            if (removeDuplicatesByName) {
                const _stop = _searchedStops.find(
                    (e) =>
                        e.stopName.toLowerCase() ===
                        stop.stopName.toLowerCase() /* && e.agency === stop.agency */
                );
                found = !!_stop;
                if (_stop) {
                    _stop.stops.push(stop);
                }
            }
            if (!found) {
                _searchedStops.push({
                    stopName: stop.stopName,
                    // agency: stop.agency,
                    stops: [stop],
                });
            }
        }

        return _searchedStops;
    }

    public async findById({
        q,
        agency,
    }: FindByIdArgs): Promise<StopResult | null> {
        if (agency === 'seta' || !agency) {
            const _s = await this.s.cercaFermata(q);
            if (_s) return { ..._s, agency: 'seta' };
        }
        if (agency === 'tper' || !agency) {
            const _t = await this.t.cercaFermata(q);
            if (_t) return { ..._t, agency: 'tper' };
        }
        return null;
    }

    public async findMultipleById({
        q,
        agency,
    }: FindMultipleByIdsArgs): Promise<StopResult[]> {
        const stops: StopResult[] = [];
        for (const id of q) {
            if (agency === 'seta' || !agency) {
                const _s = await this.s.cercaFermata(id);
                if (_s) stops.push({ ..._s, agency: 'seta' });
            }
            if (agency === 'tper' || !agency) {
                const _t = await this.t.cercaFermata(id);
                if (_t) stops.push({ ..._t, agency: 'tper' });
            }
        }
        return stops;
    }
}
