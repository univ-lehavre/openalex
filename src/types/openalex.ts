interface OpenalexSearchAuthorAffiliationResult {
  institution: {
    id: string;
    ror: string;
    display_name: string;
    country_code: string;
    type: string;
    lineage: string[];
  };
  years: number[];
}

interface OpenalexSearchAuthorResult {
  id: string;
  orcid: string;
  display_name: string;
  display_name_alternatives: string[];
  affiliations: OpenalexSearchAuthorAffiliationResult[];
  works_api_url: string;
  updated_date: string;
  created_date: string;
}

interface OpenalexResponse<T> {
  meta: {
    count: number;
    page: number;
    per_page: number;
  };
  results: T[];
}

export { OpenalexSearchAuthorResult, OpenalexResponse };
