import { Effect } from 'effect';
import qs from 'qs';

import { FetchError, StatusError } from '../errors';

import { Query } from '../types';

const fetch_one_page = <T>(
  base_url: URL,
  params: Query
): Effect.Effect<T, StatusError | FetchError, never> =>
  Effect.tryPromise({
    try: async () => {
      const url = new URL(`${base_url.toString()}?${qs.stringify(params)}`);
      const res = await fetch(url);
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

export { fetch_one_page };
