interface Stop {
    stopId: string;
    stopName: string;
    platform?: string | number;
}

export const isStop = (obj: unknown): obj is Stop => {
    if (!obj || typeof obj !== 'object') return false;

    const stop = obj as Stop;
    return (
        typeof stop.stopId === 'string' &&
        typeof stop.stopName === 'string' &&
        (stop.platform === undefined ||
            ['string', 'number'].includes(typeof stop.platform))
    );
};

export default Stop;
