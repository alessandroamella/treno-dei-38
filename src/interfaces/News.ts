import { Moment } from "moment";
import { AgencyTypeCombined } from "../AgencyType";

interface News {
    title: string;
    agency: AgencyTypeCombined;
    date: Moment;
    type: string;
    url?: string;
}

export default News;
