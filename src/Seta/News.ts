import { Moment } from "moment";
import { AgencyType } from "../AgencyType";

interface News {
    title: string;
    agency: AgencyType;
    date: Moment;
    type: string;
    url?: string;
}

export default News;
