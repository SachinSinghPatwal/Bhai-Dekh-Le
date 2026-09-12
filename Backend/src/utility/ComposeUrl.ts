import { JOb_SEARCH_URL_WITH_QUERY } from "../constants.js";

export default function ComposeUrl(){
  const { protocol , domain , query ,generic_Job_Description} = JOb_SEARCH_URL_WITH_QUERY;
  const url = `${protocol}://${domain}/${generic_Job_Description}?k=${query.keyword}&l=${query.location}&nignbevent_src=${query.job_Search_By}&experience=${query.experince}&ctcFilter=${query.salary}`;
  return url
}