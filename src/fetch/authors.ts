import { Effect } from 'effect';
import { openalex_authors_api_url } from '../config';

import { OpenalexSearchAuthorsResponse, Query } from '../types';
import { fetchAPI } from './fetch';
import { ConfigError } from 'effect/ConfigError';
import { FetchError, StatusError } from '../errors';

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
  OpenalexSearchAuthorsResponse,
  ConfigError | StatusError | FetchError,
  never
> =>
  Effect.gen(function* () {
    const params: Query = {
      search,
    };
    const response: OpenalexSearchAuthorsResponse = yield* fetchAPI(
      openalex_authors_api_url,
      params,
      start_page
    );
    return response;
  });

export { searchAuthors };
