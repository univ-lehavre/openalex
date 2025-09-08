import { Effect } from 'effect';
import { openalex_authors_api_url } from '../config';

import { fetchAPI } from './fetch-openalex';
import { ConfigError } from 'effect/ConfigError';
import { FetchError, StatusError } from '../errors';
import { OpenalexResponse, OpenalexSearchAuthorResult, Query } from '../types';

const update_total_pages = <T>(response: OpenalexResponse<T>): number => {
  const total_pages = Math.ceil(response.meta.count / response.meta.per_page);
  return total_pages;
};

const get_results = <T>(response: OpenalexResponse<T>): T[] => {
  return response.results as T[];
};

/**
 * Recherche des auteurs dans l'API OpenAlex par display_name et display_name_alternatives. Le second prénom, s’il n’est pas spécifié, renvoie tous les résultats.
 * @param search Le terme de recherche.
 * @param start_page La page de résultats à partir de laquelle commencer la recherche.
 * @returns Une réponse contenant les résultats de la recherche.
 */
const searchAuthors = (
  search: string,
  start_page: number = 1
): Effect.Effect<
  OpenalexResponse<OpenalexSearchAuthorResult>,
  ConfigError | StatusError | FetchError,
  never
> =>
  Effect.gen(function* () {
    const params: Query = {
      search,
    };
    const response: OpenalexResponse<OpenalexSearchAuthorResult> =
      yield* fetchAPI<OpenalexSearchAuthorResult>(
        openalex_authors_api_url,
        params,
        update_total_pages,
        get_results,
        start_page
      );
    return response;
  });

export { searchAuthors };
