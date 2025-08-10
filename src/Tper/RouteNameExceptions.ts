// Save map where route names differ
// from HelloBus to GTFS data

const _routeNameExceptions = {
    N1: '927',
    N2: '925',
    N3: '920',
    N4: '914',
    N5: '911',
    N6: '913',
    A: '41',
    C: '50',
    D: '57',
    T1: '43',
    T2: '42',
    FBP: '951',
    // FBV: qual è??
};

/**
 * Map from HelloBus route name to GTFS route name
 */
const routeNameExceptions = new Map(
    Object.entries(_routeNameExceptions) as [
        keyof typeof _routeNameExceptions,
        string,
    ][]
);

export const isRouteNameException = (
    routeName: string
): routeName is keyof typeof _routeNameExceptions =>
    routeNameExceptions.has(routeName as keyof typeof _routeNameExceptions);

export const getRouteNameException = (routeName: string) =>
    isRouteNameException(routeName as keyof typeof _routeNameExceptions)
        ? routeNameExceptions.get(
              routeName as keyof typeof _routeNameExceptions
          )
        : routeName;
