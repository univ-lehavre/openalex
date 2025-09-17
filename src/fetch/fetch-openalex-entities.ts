import { Effect } from 'effect';
import { getEnv } from '../config';

import { fetchAPI } from './fetch-openalex';
import { ConfigError } from 'effect/ConfigError';
import { FetchError, StatusError } from '../errors';
import { AuthorsResult, OpenalexResponse, Query, WorksResult } from '../types';

/**
 * Recherche des auteurs dans l'API OpenAlex par display_name et display_name_alternatives.
 * Le second prénom, s’il n’est pas spécifié, renvoie tous les résultats.
 * @param search Le terme de recherche.
 * @param start_page La page de résultats à partir de laquelle commencer la recherche.
 * @returns Une réponse contenant les résultats de la recherche.
 */
const searchAuthors = (
  search: string,
): Effect.Effect<OpenalexResponse<AuthorsResult>, ConfigError | StatusError | FetchError, never> =>
  Effect.gen(function* () {
    const { per_page, openalex_api_url } = yield* getEnv();
    const url = new URL(`${openalex_api_url}/authors`);
    const params: Query = {
      search,
      per_page,
    };
    const response: OpenalexResponse<AuthorsResult> = yield* fetchAPI<AuthorsResult>(url, params);
    return response;
  });

const retrieve_articles = (
  authors_ids: string[],
  institutions_ids: string[],
): Effect.Effect<OpenalexResponse<WorksResult>, ConfigError | StatusError | FetchError, never> =>
  Effect.gen(function* () {
    const { per_page, openalex_api_url } = yield* getEnv();
    const url = new URL(`${openalex_api_url}/works`);
    const filter = `author.id:${authors_ids.join('|')},institutions.id:${institutions_ids.join('|')},type:article`;
    const params: Query = {
      filter,
      per_page,
    };
    const response: OpenalexResponse<WorksResult> = yield* fetchAPI<WorksResult>(url, params);
    return response;
  });

const retrieve_articles_given_work_ids = (
  works_ids: string[],
): Effect.Effect<OpenalexResponse<WorksResult>, ConfigError | StatusError | FetchError, never> =>
  Effect.gen(function* () {
    const { per_page, openalex_api_url } = yield* getEnv();
    const url = new URL(`${openalex_api_url}/works`);
    const filter = `ids.openalex:${works_ids.join('|')}`;
    const params: Query = {
      filter,
      per_page,
    };
    const response: OpenalexResponse<WorksResult> = yield* fetchAPI<WorksResult>(url, params);
    return response;
  });

const retrieve_authors_from_orcid = (
  orcid: string,
): Effect.Effect<OpenalexResponse<AuthorsResult>, ConfigError | StatusError | FetchError, never> =>
  Effect.gen(function* () {
    const { per_page, openalex_api_url } = yield* getEnv();
    const url = new URL(`${openalex_api_url}/authors`);
    const params: Query = {
      filter: `orcid:${orcid}`,
      per_page,
    };
    const response: OpenalexResponse<AuthorsResult> = yield* fetchAPI<AuthorsResult>(url, params);
    return response;
  });

interface FetchOpenAlexAPIOptions {
  filter?: string;
  search?: string;
}

const fetchOpenAlexAPI = <T>(
  entity: 'authors' | 'works' | 'institutions',
  opts: FetchOpenAlexAPIOptions,
) =>
  Effect.gen(function* () {
    const { per_page, openalex_api_url } = yield* getEnv();
    const url = new URL(`${openalex_api_url}/${entity}`);
    const { filter, search } = opts;
    const params: Query = {
      filter,
      search,
      per_page,
    };
    const response: OpenalexResponse<T> = yield* fetchAPI<T>(url, params);
    return response;
  });

export {
  searchAuthors,
  retrieve_articles,
  retrieve_articles_given_work_ids,
  retrieve_authors_from_orcid,
  fetchOpenAlexAPI,
};
