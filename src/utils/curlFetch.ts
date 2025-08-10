import { spawn } from 'node:child_process';

export async function fetchUrlWithCurl(url: string): Promise<string | null> {
    return new Promise(resolve => {
        const curl = spawn('curl', [url]);
        let output = '';

        curl.stdout.on('data', data => {
            output += data;
        });

        curl.on('close', code => {
            if (code === 0) {
                resolve(output);
            } else {
                resolve(null);
            }
        });

        curl.on('error', () => {
            resolve(null);
        });
    });
}
