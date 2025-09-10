import { Effect, Logger, LogLevel } from 'effect';
import { chain } from 'lodash';

import { cmd } from './config';
import { searchAuthors } from './fetch';
import { multiple, log, finish, prepare, who, groupSelect } from './prompt';
import { retrieve_articles } from './fetch/fetch-openalex-entities';
import { groupByNGramSimilarity } from './group';

const program = Effect.gen(function* () {
  // Saisie du nom du chercheur
  const argv = yield* cmd();
  let name: string;
  if (argv.name) {
    name = argv.name as string;
  } else {
    console.clear();
    prepare("Fiabilité des données d'un chercheur dans OpenAlex");
    const res = yield* who('Saisissez le nom et le prénom d’un chercheur');
    name = res.name;
  }

  // Recherche des auteurs dans l’API OpenAlex
  log.info(`Téléchargeons d’OpenAlex les chercheurs avec le patronyme « ${name} »`);
  const search = yield* searchAuthors(name);
  const authors = search.results;
  if (authors.length === 0) {
    log.error(`Aucun chercheur trouvé avec le patronyme « ${name} »`);
    process.exit(1);
  }

  // Sélection des identifiants OpenAlex d’auteurs
  const display_name_alternatives = chain(authors)
    .map('display_name_alternatives')
    .flatMap()
    .uniq()
    .sort()
    .value();
  log.info(
    `Ces ${authors.length} chercheurs sont cités dans les articles selon ${display_name_alternatives.length} formes imprimées différentes`,
  );
  const selected_display_name_alternatives =
    display_name_alternatives.length === 1
      ? { selection: [display_name_alternatives[0]] }
      : yield* multiple(
          `Sélectionnez celles appropriées à ce chercheur :`,
          display_name_alternatives.map(name => ({ value: name, label: name })),
        );

  log.info(
    `Vous avez sélectionné ${selected_display_name_alternatives.selection.length} formes imprimées :\n${selected_display_name_alternatives.selection.map(name => `- ${name}`).join('\n')}`,
  );

  const selected_authors = authors.filter(
    author =>
      author.display_name_alternatives.filter(name =>
        selected_display_name_alternatives.selection.includes(name),
      ).length > 0,
  );
  log.info(
    `Parmi les ${authors.length} chercheurs téléchargés, seuls ${selected_authors.length} d’entre eux sont cités en utilisant ces formes imprimées :\n${selected_authors
      .map(author => `- ${author.display_name} (${author.id})`)
      .sort()
      .join('\n')}`,
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

  log.info(
    `Ces ${selected_authors.length} chercheurs sont affiliés à ${affiliations.length} institutions différentes`,
  );
  const selected_affiliations = yield* multiple(
    `Sélectionnez celles appropriées à ce chercheur :`,
    affiliations.map(name => ({ value: name, label: name })),
  );
  const final_affiliations = Array.from(
    new Map(
      selected_authors
        .flatMap(author =>
          author.affiliations.filter(affiliation =>
            selected_affiliations.selection.includes(affiliation.institution.display_name),
          ),
        )
        .map(affiliation => [affiliation.institution.id, affiliation] as const),
    ).values(),
  );
  log.info(
    `Vous avez sélectionné ${final_affiliations.length} affiliations :\n${final_affiliations
      .map(
        affiliation => `- ${affiliation.institution.display_name} (${affiliation.institution.id})`,
      )
      .join('\n')}`,
  );

  const final_authors = selected_authors.filter(
    author =>
      author.affiliations.filter(affiliation =>
        final_affiliations
          .map(affiliation => affiliation.institution.display_name)
          .includes(affiliation.institution.display_name),
      ).length > 0,
  );

  log.info(
    `Au final, ${final_authors.length} chercheurs sont liés à ces formes imprimées et ces affiliations :\n${final_authors
      .map(author => `- ${author.display_name} (${author.id})`)
      .sort()
      .join('\n')}`,
  );

  // Récupération des publications des auteurs et affiliations sélectionnés
  const authors_ids = final_authors.map(author => author.id);
  const institutions_ids = final_affiliations.map(affiliation => affiliation.institution.id);
  log.info(
    `Téléchargeons les articles liés à ces ${authors_ids.length} chercheurs et ces ${institutions_ids.length} affiliations`,
  );
  const articles = yield* retrieve_articles(authors_ids, institutions_ids);

  const filtered_articles = articles.results.filter(
    work =>
      work.authorships.filter(
        authorship =>
          authors_ids.includes(authorship.author.id) &&
          authorship.institutions.every(institution => institutions_ids.includes(institution.id)),
      ).length > 0,
  );

  log.info(
    `OpenAlex ne permet pas de filtrer précisément les articles.\n${filtered_articles.length} articles correspondent précisément aux critères sélectionnés.`,
  );

  const raw_author_name = Array.from(
    new Map(
      filtered_articles
        .map(work => work.authorships)
        .flat()
        .filter(autorship => authors_ids.includes(autorship.author.id))
        .map(autorship => [autorship.raw_author_name, autorship.raw_author_name]),
    ).values(),
  ).sort((a, b) => a.localeCompare(b));
  log.info(
    `Ces articles citent ${raw_author_name.length} formes imprimées différentes pour le nom de l’auteur :\n${raw_author_name
      .map(name => `- ${name}`)
      .join('\n')}`,
  );

  const raw_affiliations_string = Array.from(
    new Map(
      filtered_articles
        .map(work => work.authorships)
        .flat()
        .filter(autorship => authors_ids.includes(autorship.author.id))
        .map(autorship => autorship.raw_affiliation_strings)
        .flat()
        .map(name => [name, name]),
    ).values(),
  ).sort((a, b) => a.localeCompare(b));

  const groups = groupByNGramSimilarity(raw_affiliations_string, 0.5);

  console.log(JSON.stringify(groups, null, 2));

  const opts: Record<string, { value: string; label?: string }[]> = groups.reduce(
    (acc, group, index) => {
      acc[`Groupe ${index + 1}`] = group.map(name => ({ value: name, label: name }));
      return acc;
    },
    {} as Record<string, { value: string; label?: string }[]>,
  );

  // groupSelect expects a Record<string, Option[]> so provide a keyed options object
  yield* groupSelect({
    message: 'Sélectionnez les formes appropriées pour les affiliations :',
    options: opts,
    selectableGroups: true,
    groupSpacing: 1,
  });

  // const raw_affiliations_string = chain(filtered_articles)
  //   .map('authorships')
  //   .flatMap()
  //   .map('raw_affiliation_strings')
  //   .flatMap()
  //   .uniq()
  //   .sort()
  //   .value();
  // log.info(
  //   `Ces articles citent ${raw_affiliations_string.length} formes imprimées différentes pour les affiliations :\n${raw_affiliations_string
  //     .map(name => `- ${name}`)
  //     .join('\n')}`,
  // );

  // const selected_articles = yield* multiple(
  //   `Sélectionnez les articles correspondant à « ${name} » :`,
  //   filtered_articles
  //     .sort((a, b) => b.publication_year - a.publication_year)
  //     .map(article => ({
  //       value: article.id,
  //       label: `${article.publication_year} - ${article.title} | ${article.id}`,
  //     })),
  // );

  finish('Fin');
});

Effect.runPromiseExit(program.pipe(Logger.withMinimumLogLevel(LogLevel.None)));
