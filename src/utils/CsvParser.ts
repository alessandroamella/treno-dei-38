import { parse } from 'csv-parse';

class CsvParser {
    public static parseAsync<T>(input: string, options: object): Promise<T> {
        return new Promise((resolve, reject) => {
            parse(input, options, (err, records) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(records);
                }
            });
        });
    }
}
export default CsvParser;
