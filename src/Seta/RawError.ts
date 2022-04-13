interface RawError {
    arrival: {
        error: "no arrivals scheduled in next 90 minutes";
        waypoint: string;
    };
}

export const isRawError = (obj: unknown): obj is RawError => {
    if (!obj || typeof obj !== "object") {
        return false;
    }

    const _obj = obj as RawError;
    return typeof _obj?.arrival?.error === "string";
};

export default RawError;
