import { Config, Effect } from 'effect';
import yargs from 'yargs';

import { Args } from './types';

const openalex_api_base = 'https://api.openalex.org';
const openalex_authors_api_url = new URL(`${openalex_api_base}/authors`);

const getArguments = () => {
  const argv = yargs(process.argv.slice(2))
    .demandOption(['name'])
    .parse() as Args;
  return { name: argv.name };
};

const getEnv = () =>
  Effect.gen(function* () {
    const mail = yield* Config.string('MAIL');
    return { mail };
  });

export { getEnv, getArguments, openalex_authors_api_url };
