import { Effect } from 'effect';
import { chain } from 'lodash';
import { writeFileSync } from 'node:fs';

import { parameters } from './config';
import { searchAuthors } from './fetch';
import { DevToolsLive, LogLevelLive, NodeRuntime } from './effect';
import { multiple, log, finish } from './prompt';

const program = Effect.gen(function* () {
  const { name } = yield* parameters();
  const search = yield* searchAuthors(name);
  const authors = search.results;

  // Sélection des identifiants OpenAlex d’auteurs
  const display_name = chain(authors).map('display_name').uniq().sort().value();
  if (display_name.length === 0) {
    log.error(`Aucun chercheur trouvé pour « ${name} »`);
    process.exit(1);
  }
  log.info(
    `Nous avons trouvé ${authors.length} identifiants OpenAlex pour ce chercheur·euse`
  );
  const display_name_alternatives = chain(authors)
    .map('display_name_alternatives')
    .flatMap()
    .uniq()
    .sort()
    .value();
  const { selection } =
    display_name_alternatives.length === 1
      ? { selection: [display_name_alternatives[0]] }
      : yield* multiple(
          `Parmi les ${display_name_alternatives.length} formes imprimées suivantes, veuillez sélectionner celles qui correspondent le mieux à ce chercheur·euse (« ${name} ») :`,
          display_name_alternatives.map(name => ({ value: name, label: name }))
        );
  const selected_authors = authors.filter(
    author =>
      author.display_name_alternatives.filter(name => selection.includes(name))
        .length > 0
  );
  log.info(
    `${selected_authors.length} identifiants OpenAlex sont liés à ces formes imprimées :\n${selected_authors.map(author => `- ${author.display_name} (${author.id})`).join('\n')}`
  );
  const affiliation_display_names = chain(authors)
    .map('affiliations')
    .flatMap()
    .map('institution')
    .map('display_name')
    .uniq()
    .sort()
    .value();

  const removed_affiliations = chain(
    authors.filter(
      author =>
        author.display_name_alternatives.filter(name =>
          selection.includes(name)
        ).length === 0
    )
  )
    .map('affiliations')
    .flatMap()
    .map('institution')
    .map('display_name')
    .uniq()
    .sort()
    .value();

  log.info(
    `${removed_affiliations.length} affiliations ont été écartées car elles sont liées à des identifiants OpenAlex non sélectionnés :\n${removed_affiliations.map(name => `- ${name}`).join('\n')}`
  );

  const affiliations = chain(selected_authors)
    .map('affiliations')
    .flatMap()
    .map('institution')
    .map('display_name')
    .uniq()
    .sort()
    .value();

  const selected_affiliations = yield* multiple(
    `Parmi les ${affiliations.length} affiliations suivantes, veuillez sélectionner celles qui correspondent le mieux à ce chercheur·euse (« ${name} ») :`,
    affiliations.map(name => ({ value: name, label: name }))
  );

  const final_authors = selected_authors.filter(
    author =>
      author.affiliations.filter(affiliation =>
        selected_affiliations.selection.includes(
          affiliation.institution.display_name
        )
      ).length > 0
  );

  log.info(
    `${final_authors.length} identifiants OpenAlex sont liés à ces affiliations :\n${final_authors
      .map(author => `- ${author.display_name} (${author.id})`)
      .sort()
      .join('\n')}`
  );

  const results = {
    meta: search.meta,
    results: authors,
    groups: {
      display_name,
      display_name_alternatives,
      affiliation_display_names,
    },
  };
  const filePath = `./${name}-results.json`;
  writeFileSync(filePath, JSON.stringify(results, null, 2), 'utf8');
  finish('C’est parti !');

  return results;
});

program.pipe(
  Effect.provide(DevToolsLive),
  Effect.provide(LogLevelLive),
  NodeRuntime.runMain
);
