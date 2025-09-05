import process from 'node:process';
import { Config, Effect } from 'effect';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { prepare, finish, who } from './prompt';

const openalex_api_base = 'https://api.openalex.org';
const openalex_authors_api_url = new URL(`${openalex_api_base}/authors`);

const getEnv = () =>
  Effect.gen(function* () {
    const mail = yield* Config.string('MAIL');
    return { mail };
  });

const cmd = () =>
  Effect.tryPromise({
    try: async () => {
      const argv = await yargs(hideBin(process.argv)).parse();
      return argv;
    },
    catch: (cause: unknown) =>
      new Error(`Error while parsing arguments`, { cause }),
  });

const prompt = () =>
  Effect.gen(function* () {
    prepare('Paramètres requis');
    const { name } = yield* who();
    finish('C’est parti !');
    return { name };
  });

const getName = () =>
  Effect.gen(function* () {
    const argv = yield* cmd();
    if (argv.name) {
      return { name: argv.name as string };
    } else {
      const { name } = yield* prompt();
      return { name };
    }
  });

export { getEnv, getName, openalex_authors_api_url };
