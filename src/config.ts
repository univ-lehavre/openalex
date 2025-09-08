import process from 'node:process';
import { Config, Effect } from 'effect';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { ConfigError } from 'effect/ConfigError';
import { CommandLineError } from './errors';
import { Args, Env } from './types';

const getEnv = (): Effect.Effect<Env, ConfigError, never> =>
  Effect.gen(function* () {
    const user_agent = yield* Config.string('USER_AGENT');
    const rate_limit_stringified = yield* Config.string('RATE_LIMIT');
    const openalex_api_url = yield* Config.string('OPENALEX_API_URL');
    const per_page = yield* Config.number('PER_PAGE');
    const rate_limit = JSON.parse(rate_limit_stringified);
    return { user_agent, rate_limit, per_page, openalex_api_url };
  });

const cmd = (): Effect.Effect<Args, CommandLineError, never> =>
  Effect.tryPromise({
    try: async () => {
      const argv = await yargs(hideBin(process.argv)).parse();
      return { name: argv.name as string | undefined };
    },
    catch: (cause: unknown) => new CommandLineError(`Error while parsing arguments`, { cause }),
  });

export { getEnv, cmd };
