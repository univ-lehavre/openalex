import { Effect } from 'effect';
import { fetch_one_page } from './legacy';
import { getEnv, openalex_authors_api_url } from '../config';
import { OpenalexSearchAuthorsResponse, Query } from '../types';

const loop = (
  start_page: number,
  total_pages: number,
  search: string,
  mail: string
) =>
  Effect.loop(start_page, {
    while: state => state >= total_pages,
    step: state => state + 1,
    body: state =>
      Effect.gen(function* () {
        const params: Query = {
          search,
          mailto: mail,
          page: state,
        };
        const response = yield* fetch_one_page<OpenalexSearchAuthorsResponse>(
          openalex_authors_api_url,
          params
        );
        total_pages = Math.ceil(response.meta.count / response.meta.per_page);
        return response.results;
      }),
  });

const getAuthors = (search: string, start_page: number = 1) =>
  Effect.gen(function* () {
    const { mail } = yield* getEnv();
    const raw = yield* loop(start_page, Infinity, search, mail);
    const results = raw.flat();
    const result: OpenalexSearchAuthorsResponse = {
      meta: {
        count: results.length,
        page: 1,
        per_page: results.length,
      },
      results: results,
    };
    return result;
  });

export { getAuthors };
