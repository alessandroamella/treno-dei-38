interface RawData {
    arrival: {
        waypont: string;
        services: {
            service: string;
            arrival: string;
            type: 'planned' | 'realtime';
            destination: string;
            fleetCode: 'MO';
            dutyId: string;
            busnum: string | '';
            serviceType: 'UR' | 'EX';
            occupancyStatus: string | null;
            codice_corsa: string;
            posti_totali: number | null;
            num_passeggeri: number | null;
            next_stop: string | null;
        }[];
    };
}

export default RawData;
