import type { Moment } from 'moment';
import type { NewsType } from './AgencyType';

interface News {
    title: string;
    agency: NewsType;
    date: Moment;
    type: string;
    url?: string;
}

export default News;
