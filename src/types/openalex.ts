interface Affiliation {
  institution: {
    id: string;
    display_name: string;
    country_code: string | null;
    ror: string | null;
    wikidata: string | null;
    type: string | null;
    lineage: string[] | null;
  };
  years: number[];
}

interface OpenalexSearchAuthorResult {
  id: string;
  display_name: string;
  display_name_alternatives: string[];
  affiliations: Affiliation[];
  created_date: string;
}

interface OpenalexSearchAuthorsResponse {
  meta: {
    count: number;
    page: number;
    per_page: number;
  };
  results: OpenalexSearchAuthorResult[];
}

export { OpenalexSearchAuthorResult, OpenalexSearchAuthorsResponse };
