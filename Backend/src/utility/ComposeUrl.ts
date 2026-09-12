import { JOb_SEARCH_URL_WITH_QUERY } from "../constants.js";

export default function ComposeUrl(){
  const { protocol , domain , query ,generic_Job_Description} = JOb_SEARCH_URL_WITH_QUERY;
  const url = `${protocol}${domain}${generic_Job_Description}${query.keyword}${query.job_Search_By}${query.experince}${query.salary}`;
  return url
}