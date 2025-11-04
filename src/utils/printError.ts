import { isAxiosError } from 'axios';
import { logger } from './logger';

const printError = (prefixStr: string, err?: unknown) => {
    logger.error(prefixStr);
    if (!err) return;
    if (err instanceof Error) {
        if (isAxiosError(err)) {
            logger.error(err.response?.data || err.response);
        } else {
            logger.error(err.message);
        }
    } else {
        logger.error(err);
    }
};

export default printError;
