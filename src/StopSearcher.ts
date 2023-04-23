import Fuse from "fuse.js";
import { AgencyType, CombinedStop } from "./AgencyType";
import { logger } from "./logger";
import Seta from "./Seta";
import Stop from "./Seta/Stop";
import Tper, { TperStop } from "./Tper";

interface FindStopArgs {
    q: string;
    removeDuplicatesByName?: boolean;
    limit?: number;
    sort?: boolean;
}

type StopResult = CombinedStop & { agency: AgencyType };

export default class StopSearcher {
    private s: Seta;
    private t: Tper;

    constructor(s: Seta, t: Tper) {
        this.s = s;
        this.t = t;
    }

    public async findStop({
        q,
        limit,
        sort,
        removeDuplicatesByName
    }: FindStopArgs): Promise<StopResult[]> {
        const _s = await this.s.cercaFermatePerNome(q);
        const _t = await this.t.cercaFermatePerNome(q);
        let stops: Fuse.FuseResult<StopResult>[] = [
            ...(<Fuse.FuseResult<Stop & { agency: AgencyType }>[]>(
                _s.map(e => ({ ...e, item: { ...e.item, agency: "seta" } }))
            )),
            ...(<Fuse.FuseResult<TperStop & { agency: AgencyType }>[]>(
                _t.map(e => ({ ...e, item: { ...e.item, agency: "tper" } }))
            ))
        ];

        stops.sort((a, b) => (a.score ?? 0) - (b.score ?? 0));

        logger.debug(`Ricerca fermata fuzzy ${stops.length} risultati`);

        if (limit) stops = stops.slice(0, limit);

        if (removeDuplicatesByName)
            stops = stops.filter(
                (v, i, a) =>
                    a.findIndex(
                        v2 =>
                            v2.item.stopName.toLowerCase() ===
                            v.item.stopName.toLowerCase()
                    ) === i
            );

        if (sort) stops.sort((a, b) => (a.score ?? 0) - (b.score ?? 0));

        return stops.map(s => s.item);
    }
}
