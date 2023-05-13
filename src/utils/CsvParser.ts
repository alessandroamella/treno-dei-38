import { parse } from "csv-parse";

class CsvParser {
    public static parseAsync(input: string, options: object): Promise<any> {
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
