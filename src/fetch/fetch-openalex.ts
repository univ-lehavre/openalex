import { Effect, RateLimiter } from 'effect';

import { fetch_one_page } from './fetch';
import { getEnv } from '../config';
import { ConfigError } from 'effect/ConfigError';
import { FetchError, StatusError } from '../errors';
import { OpenalexResponse, Query } from '../types';

const fetchAPI = <T>(
  base_url: URL,
  params: Query,
  update_total_pages: (response: OpenalexResponse<T>) => number,
  get_results: (response: OpenalexResponse<T>) => T[],
  start_page: number = 1
): Effect.Effect<OpenalexResponse<T>, ConfigError | StatusError | FetchError, never> =>
  Effect.scoped(
    Effect.gen(function* () {
      const { user_agent, rate_limit } = yield* getEnv();
      const ratelimiter: RateLimiter.RateLimiter = yield* RateLimiter.make(rate_limit);
      const raw = yield* exhaust<T>(
        ratelimiter,
        start_page,
        Infinity,
        params,
        user_agent,
        base_url,
        update_total_pages,
        get_results
      );
      const results = raw.flat();
      const result: OpenalexResponse<T> = {
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

const exhaust = <T>(
  ratelimiter: RateLimiter.RateLimiter,
  start_page: number,
  total_pages: number,
  params: Query,
  user_agent: string,
  base_url: URL,
  update_total_pages: (response: OpenalexResponse<T>) => number = () => total_pages,
  get_results: (response: OpenalexResponse<T>) => T[] = response => response.results
): Effect.Effect<T[][], StatusError | FetchError, never> =>
  Effect.loop(start_page, {
    while: state => state < total_pages,
    step: state => state + 1,
    body: state =>
      Effect.gen(function* () {
        params.page = state;
        const response = yield* ratelimiter(
          fetch_one_page<OpenalexResponse<T>>(base_url, params, user_agent)
        );
        total_pages = update_total_pages(response);
        const result = get_results(response);
        return result;
      }),
  });

export { fetchAPI };
