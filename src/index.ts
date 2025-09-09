import { Effect, Logger, LogLevel } from 'effect';
import { chain } from 'lodash';

import { cmd } from './config';
import { searchAuthors } from './fetch';
import { multiple, log, finish, prepare, who } from './prompt';
import { retrieve_articles } from './fetch/fetch-openalex-entities';

const program = Effect.gen(function* () {
  // Saisie du nom du chercheur
  const argv = yield* cmd();
  let name: string;
  if (argv.name) {
    name = argv.name as string;
  } else {
    prepare('OpenAlex');
    const res = yield* who('Précisez le nom d’un chercheur');
    name = res.name;
  }

  // Recherche des auteurs dans l’API OpenAlex
  const search = yield* searchAuthors(name);
  const authors = search.results;

  // Sélection des identifiants OpenAlex d’auteurs
  const display_name = chain(authors).map('display_name').uniq().sort().value();
  if (display_name.length === 0) {
    log.error(`Aucun chercheur trouvé pour « ${name} »`);
    process.exit(1);
  }
  const display_name_alternatives = chain(authors)
    .map('display_name_alternatives')
    .flatMap()
    .uniq()
    .sort()
    .value();
  const selected_display_name_alternatives =
    display_name_alternatives.length === 1
      ? { selection: [display_name_alternatives[0]] }
      : yield* multiple(
          `Parmi les ${display_name_alternatives.length} formes imprimées suivantes, veuillez sélectionner celles qui correspondent le mieux à « ${name} »`,
          display_name_alternatives.map(name => ({ value: name, label: name })),
        );

  log.info(
    `${selected_display_name_alternatives.selection.length} formes imprimées sélectionnées :\n${selected_display_name_alternatives.selection.map(name => `- ${name}`).join('\n')}`,
  );

  const selected_authors = authors.filter(
    author =>
      author.display_name_alternatives.filter(name =>
        selected_display_name_alternatives.selection.includes(name),
      ).length > 0,
  );
  log.info(
    `${selected_authors.length} identifiants OpenAlex de chercheurs sont liés à ces formes imprimées`,
  );

  // Sélection des affiliations
  const affiliations = chain(selected_authors)
    .map('affiliations')
    .flatMap()
    .map('institution')
    .map('display_name')
    .uniq()
    .sort()
    .value();

  const selected_affiliations = yield* multiple(
    `Parmi les ${affiliations.length} affiliations suivantes, veuillez sélectionner celles qui correspondent le mieux à « ${name} »`,
    affiliations.map(name => ({ value: name, label: name })),
  );

  log.info(
    `${selected_affiliations.selection.length} affiliations sélectionnées :\n${selected_affiliations.selection
      .map(name => `- ${name}`)
      .join('\n')}`,
  );

  const final_authors = selected_authors.filter(
    author =>
      author.affiliations.filter(affiliation =>
        selected_affiliations.selection.includes(affiliation.institution.display_name),
      ).length > 0,
  );

  log.info(
    `${final_authors.length} identifiants OpenAlex sont liés à ces affiliations :\n${final_authors
      .map(author => `- ${author.display_name} (${author.id})`)
      .sort()
      .join('\n')}`,
  );

  // Récupération des publications des auteurs et affiliations sélectionnés
  const authors_ids = final_authors.map(author => author.id);
  const institutions_ids = chain(final_authors)
    .map('affiliations')
    .flatMap()
    .map('institution')
    .map('id')
    .uniq()
    .value();
  const articles = yield* retrieve_articles(authors_ids, institutions_ids);

  log.info(`${articles.meta.count} articles trouvées`);

  const selected_articles = yield* multiple(
    `Parmi les ${articles.meta.count} articles trouvées, veuillez sélectionner celles que vous souhaitez conserver`,
    articles.results
      .sort((a, b) => b.publication_year - a.publication_year)
      .map(article => ({
        value: article.id,
        label: `${article.publication_year} - ${article.title}`,
      })),
  );

  finish('Fin');

  return selected_articles.selection;
});

Effect.runPromiseExit(program.pipe(Logger.withMinimumLogLevel(LogLevel.None)));
