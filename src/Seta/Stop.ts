interface Stop {
    stopId: string;
    stopName: string;
    coordX: number;
    coordY: number;
    platform?: string | number;
}

export const isStop = (obj: unknown): obj is Stop => {
    if (!obj || typeof obj !== 'object') return false;

    const stop = obj as Stop;
    return !(
        typeof stop.coordX !== 'number' ||
        typeof stop.coordY !== 'number' ||
        (stop.platform &&
            typeof stop.platform !== 'string' &&
            typeof stop.platform !== 'number') ||
        typeof stop.stopId !== 'string' ||
        typeof stop.stopName !== 'string'
    );
};

export default Stop;
