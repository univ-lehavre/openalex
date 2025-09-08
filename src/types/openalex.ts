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

interface AuthorsSearchResult {
  id: string;
  orcid: string;
  display_name: string;
  display_name_alternatives: string[];
  affiliations: OpenalexSearchAuthorAffiliationResult[];
  works_api_url: string;
  updated_date: string;
  created_date: string;
}

interface Authorship {
  author_position: string;
  author: {
    id: string;
    display_name: string;
    orcid: string;
  };
  institutions: {
    id: string;
    display_name: string;
    ror: string;
    country_code: string;
    type: string;
    lineage: string[];
  }[];
}

interface WorksResult {
  id: string;
  doi: string;
  title: string;
  display_name: string;
  publication_year: number;
  type: string;
  authorships: Authorship[];
}

interface OpenalexResponse<T> {
  meta: {
    count: number;
    page: number;
    per_page: number;
  };
  results: T[];
}

export { AuthorsSearchResult, OpenalexResponse, WorksResult };
