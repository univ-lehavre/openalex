interface OpenalexSearchAuthorResult {
  id: string;
  display_name: string;
  display_name_alternatives: string[];
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
