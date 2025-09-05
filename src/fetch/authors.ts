import { Effect, RateLimiter } from 'effect';
import qs from 'qs';
import { getEnv, openalex_authors_api_url } from '../config';

import { ConfigError } from 'effect/ConfigError';
import { FetchError, StatusError } from '../errors';
import {
  OpenalexSearchAuthorResult,
  OpenalexSearchAuthorsResponse,
  Query,
} from '../types';

const getAuthors = (
  search: string,
  start_page: number = 1
): Effect.Effect<
  OpenalexSearchAuthorsResponse,
  ConfigError | StatusError | FetchError,
  never
> =>
  Effect.scoped(
    Effect.gen(function* () {
      const { mail } = yield* getEnv();
      const ratelimiter = yield* RateLimiter.make({
        limit: 10,
        interval: '1 seconds',
        algorithm: 'fixed-window',
      });

      const raw = yield* exhaust(
        ratelimiter,
        start_page,
        Infinity,
        search,
        mail
      );
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
    })
  );

const exhaust = (
  ratelimiter: RateLimiter.RateLimiter,
  start_page: number,
  total_pages: number,
  search: string,
  mail: string
): Effect.Effect<
  OpenalexSearchAuthorResult[][],
  StatusError | FetchError,
  never
> =>
  Effect.loop(start_page, {
    while: state => state < total_pages,
    step: state => state + 1,
    body: state =>
      Effect.gen(function* () {
        const params: Query = {
          search,
          page: state,
        };
        const response = yield* ratelimiter(
          fetch_one_page<OpenalexSearchAuthorsResponse>(
            openalex_authors_api_url,
            params,
            `mailto:${mail}`
          )
        );
        total_pages = Math.ceil(response.meta.count / response.meta.per_page);
        return response.results;
      }),
  });

const build_url = (base_url: URL, params: Query): URL => {
  const search_params = qs.stringify(params);
  const url_string = `${base_url.toString()}?${search_params}`;
  return new URL(url_string);
};

const fetch_one_page = <T>(
  base_url: URL,
  params: Query,
  email: string
): Effect.Effect<T, StatusError | FetchError, never> =>
  Effect.tryPromise({
    try: async () => {
      const url = build_url(base_url, params);
      const headers = new Headers();
      headers.append('Accept', 'application/json');
      headers.append('User-Agent', `OpenAlex API Client - ${email}`);
      const res = await fetch(url, {
        method: 'GET',
        headers,
      });
      if (!res.ok)
        throw new StatusError(`Le serveur a retourné un statut inattendu`, {
          cause: `HTTP ${res.status}: ${res.statusText}`,
        });
      const json = await res.json();
      return json as T;
    },
    catch: (cause: unknown) =>
      new FetchError(`La fonction fetch a retourné une erreur`, { cause }),
  });

export { getAuthors };
