import { Effect } from 'effect';
import { chain } from 'lodash';
import { writeFileSync } from 'node:fs';

import { parameters } from './config';
import { searchAuthors } from './fetch';
import { DevToolsLive, LogLevelLive, NodeRuntime } from './effect';

const program = Effect.gen(function* () {
  const { name } = yield* parameters();
  const authors = yield* searchAuthors(name);
  const display_name = chain(authors.results)
    .map('display_name')
    .uniq()
    .sort()
    .value();
  const display_name_alternatives = chain(authors.results)
    .map('display_name_alternatives')
    .flatMap()
    .uniq()
    .sort()
    .value();
  const affiliation_display_names = chain(authors.results)
    .map('affiliations')
    .flatMap()
    .map('institution')
    .map('display_name')
    .uniq()
    .sort()
    .value();
  const results = {
    meta: authors.meta,
    results: authors.results,
    groups: {
      display_name,
      display_name_alternatives,
      affiliation_display_names,
    },
  };
  const filePath = `./${name}-results.json`;
  writeFileSync(filePath, JSON.stringify(results, null, 2), 'utf8');
  return results;
});

program.pipe(
  Effect.provide(DevToolsLive),
  Effect.provide(LogLevelLive),
  NodeRuntime.runMain
);
