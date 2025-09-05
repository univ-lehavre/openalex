import { Effect } from 'effect';
import { chain } from 'lodash';

import { getName } from './config';
import { getAuthors } from './fetch';
import { DevToolsLive, LogLevelLive, NodeRuntime } from './effect';

const program = Effect.gen(function* () {
  const { name } = yield* getName();
  const authors = yield* getAuthors(name);
  const display_name = chain(authors.results)
    .map('display_name')
    .uniq()
    .sort()
    .value();
  yield* Effect.log(display_name);
  const display_name_alternatives = chain(authors.results)
    .map('display_name_alternatives')
    .flatMap()
    .uniq()
    .sort()
    .value();
  yield* Effect.log(display_name_alternatives);
  const affiliation_display_names = chain(authors.results)
    .map('affiliations')
    .flatMap()
    .map('institution')
    .map('display_name')
    .uniq()
    .sort()
    .value();
  yield* Effect.log(affiliation_display_names);
});

program.pipe(
  Effect.provide(DevToolsLive),
  Effect.provide(LogLevelLive),
  NodeRuntime.runMain
);
