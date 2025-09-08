import process from 'node:process';
import { Config, Effect } from 'effect';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { prepare, who } from './prompt';
import { ConfigError } from 'effect/ConfigError';
import { CommandLineError, PromptError } from './errors';
import { Args, Env } from './types';

const openalex_api_base = 'https://api.openalex.org';
const openalex_authors_api_url = new URL(`${openalex_api_base}/authors`);

const getEnv = (): Effect.Effect<Env, ConfigError, never> =>
  Effect.gen(function* () {
    const mail = yield* Config.string('MAIL');
    return { mail };
  });

const cmd = (): Effect.Effect<Args, CommandLineError, never> =>
  Effect.tryPromise({
    try: async () => {
      const argv = await yargs(hideBin(process.argv)).parse();
      return { name: argv.name as string | undefined };
    },
    catch: (cause: unknown) =>
      new CommandLineError(`Error while parsing arguments`, { cause }),
  });

const prompt = (): Effect.Effect<{ name: string }, PromptError, never> =>
  Effect.gen(function* () {
    prepare('OpenAlex');
    const { name } = yield* who();
    return { name };
  });

const parameters = (): Effect.Effect<
  { name: string },
  CommandLineError | PromptError,
  never
> =>
  Effect.gen(function* () {
    const argv = yield* cmd();
    if (argv.name) {
      return { name: argv.name as string };
    } else {
      const { name } = yield* prompt();
      return { name };
    }
  });

export { getEnv, parameters, openalex_authors_api_url };
