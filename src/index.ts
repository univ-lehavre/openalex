import { DevTools } from '@effect/experimental';
import { NodeRuntime, NodeSocket } from '@effect/platform-node';
import { Config, Effect, Layer } from 'effect';

const openalex_api_base = 'https://api.openalex.org';
const people_search_api = `${openalex_api_base}/authors`;

const getEnvironmentVariable = Effect.gen(function* () {
  const mail = yield* Config.string('MAIL');
  return { mail };
});

const fetchAuthorsJson = (
  api_url: string,
  search: string,
  mail: string,
  page: number = 1
) =>
  Effect.tryPromise({
    try: async () => {
      const params = new URLSearchParams({
        search,
        mailto: mail,
        page: String(page),
      });
      const query = params.toString();
      const res = await fetch(`${api_url}?${query}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return res.json();
    },
    catch: (reason: unknown) =>
      reason instanceof Error ? reason : new Error(String(reason)),
  });

const program = Effect.gen(function* () {
  const { mail } = yield* getEnvironmentVariable;
  const authors = yield* fetchAuthorsJson(people_search_api, 'Einstein', mail);
  console.log(JSON.stringify(authors, null, 2));
});

const DevToolsLive = DevTools.layerWebSocket().pipe(
  Layer.provide(NodeSocket.layerWebSocketConstructor)
);

program.pipe(Effect.provide(DevToolsLive), NodeRuntime.runMain);
