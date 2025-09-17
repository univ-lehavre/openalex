import { intro, log, outro, select, text, multiselect } from '@clack/prompts';
import { Context, Effect, Ref } from 'effect';
import { writeFileSync, readFileSync, existsSync, copyFileSync } from 'fs';
import color from 'picocolors';
import { fetchOpenAlexAPI } from './fetch/fetch-openalex-entities';
import type { AuthorsResult } from './types';

type Status = 'pending' | 'resolved' | 'rejected';

export interface Values {
  value: string;
  status: Status;
}

export interface OpenAlexID {
  id: string;
  label: string;
  status: Status;
}

// export interface IState {
//   orcid?: string;
//   authors?: {
//     id: OpenAlexID[];
//     orcid: string;
//     display_name?: Values[];
//     display_name_alternatives?: Values[];
//     raw_author_name?: Values[];
//     institutions?: OpenAlexID[];
//     works?: OpenAlexID[];
//   }[];
//   institutions?: {
//     ror?: string;
//     ids?: OpenAlexID[];
//     display_name?: Values[];
//     display_name_alternatives?: Values[];
//     raw_affiliation_strings?: Values[];
//   }[];
//   works?: {
//     doi?: string;
//     ids?: OpenAlexID[];
//     title?: string;
//   }[];
// }

type IAuthorType = 'id' | 'display_name_alternatives' | 'raw_author_name' | 'institution' | 'work';

interface IAuthor {
  orcid: string;
  type: IAuthorType;
  value: string;
  label?: string;
  status: Status;
}

type IInstitutionType = 'id' | 'display_name_alternatives' | 'raw_affiliation_strings';

interface IInstitution {
  ror: string;
  type: IInstitutionType;
  value: string;
  label?: string;
  status: Status;
}

type IWorkType = 'id';

interface IWork {
  doi: string;
  type: IWorkType;
  value: string;
  label?: string;
  status: Status;
}

interface IContext {
  type: 'author' | 'institution' | 'work';
  id: string;
  label?: string;
}

interface IState {
  context?: IContext;
  authors?: IAuthor[];
  institutions?: IInstitution[];
  works?: IWork[];
}

class State extends Context.Tag('State')<State, Ref.Ref<IState>>() {}

const set_ORCID = () =>
  Effect.gen(function* () {
    const orcid = yield* Effect.tryPromise({
      try: () =>
        text({
          message: 'Saisissez l’ORCID d’un chercheur',
          placeholder: '0000-0002-1825-0097',
          validate: value => {
            if (!value) return 'L’ORCID est requis';
            const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}(\d|X)$/;
            if (!orcidRegex.test(value)) return 'L’ORCID doit être au format 0000-0000-0000-0000';
          },
        }),
      catch: () => process.exit(0),
    });
    const state = yield* State;

    const authors = yield* fetchOpenAlexAPI<AuthorsResult>('authors', {
      filter: `orcid:${orcid.toString()}`,
    });

    const context: IContext = {
      type: 'author',
      id: orcid.toString(),
      label: authors.results[0]?.display_name,
    };
    yield* Ref.update(state, state => ({
      ...state,
      context,
    }));

    const items: IAuthor[] = [];

    authors.results.forEach(author =>
      items.push({
        orcid: orcid.toString(),
        type: 'id',
        value: author.id,
        label: author.display_name,
        status: 'pending',
      }),
    );
    authors.results
      .map(author => author.display_name_alternatives)
      .flat()
      .forEach(alternative => {
        items.push({
          orcid: orcid.toString(),
          type: 'display_name_alternatives',
          value: alternative,
          status: 'pending',
        });
      });
    authors.results
      .map(author => author.affiliations)
      .flat()
      .map(affiliation => affiliation.institution)
      .forEach(institution => {
        items.push({
          orcid: orcid.toString(),
          type: 'institution',
          value: institution.id,
          label: institution.display_name,
          status: 'pending',
        });
      });
    const current_state = yield* Ref.get(state);

    const current_authors = current_state.authors?.filter(a => a.orcid === orcid.toString()) ?? [];

    const filterOutExisting = (incoming: IAuthor[], existing: IAuthor[]) =>
      incoming.filter(
        i => !existing.some(e => e.orcid === i.orcid && e.type === i.type && e.value === i.value),
      );

    const filtered = filterOutExisting(items, current_authors);

    yield* Ref.update(state, state => ({
      ...state,
      authors: [...(state.authors ?? []), ...filtered],
    }));
  });

const exit = (): Effect.Effect<never, never, State> =>
  Effect.gen(function* () {
    const state = yield* State;
    if (existsSync('state.json'))
      copyFileSync('state.json', `state-${new Date().toISOString().replaceAll(/[:.]/g, '-')}.json`);
    const value = yield* Ref.get(state);
    writeFileSync('state.json', JSON.stringify(value, null, 2), 'utf-8');
    outro(`${color.bgGreen(color.black(` Fin `))}`);
    process.exit(0);
  });

export interface Action {
  name: string;
  type: 'action' | 'task';
  isActive: (state?: IState) => boolean;
}

const actions: Action[] = [
  {
    name: 'Sélectionner un chercheur avec son ORCID',
    type: 'action',
    isActive: (state?: IState) => !(state?.context?.type === 'author'),
  },
  {
    name: 'Quitter l’application',
    type: 'action',
    isActive: () => true,
  },
];

const loadState = (file: string): Effect.Effect<void, never, State> =>
  Effect.gen(function* () {
    const state = yield* State;
    if (existsSync(file)) {
      const data = readFileSync(file, 'utf-8');
      const parsed: IState = JSON.parse(data);
      yield* Ref.set(state, parsed);
      log.info(`État précédent chargé depuis le fichier "${file}"`);
    }
  });

const build_actions_list = () =>
  Effect.gen(function* () {
    const state = yield* Ref.get(yield* State);
    const available_actions = actions
      .filter(action => action.isActive(state) ?? true)
      .map(action => ({ value: action.name, label: action.name }));
    const current_tasks =
      state.authors
        ?.filter(
          author =>
            author.orcid === state.context?.id &&
            author.status === 'pending' &&
            author.type === 'display_name_alternatives',
        )
        .map(author => ({ value: author.value, label: author.value })) ?? [];
    if (current_tasks.length > 0)
      return [
        ...available_actions,
        {
          value: 'Fiabiliser les formes graphiques',
          label: 'Fiabiliser les formes graphiques',
        },
      ];
  });

const set_graphical_forms = () =>
  Effect.gen(function* () {
    yield* Effect.logInfo('Fiabilisation des formes graphiques');
    const state = yield* Ref.get(yield* State);
    const pendings = state.authors?.filter(
      author =>
        author.orcid === state.context?.id &&
        author.status === 'pending' &&
        author.type === 'display_name_alternatives',
    );
    const opts = pendings?.map(author => ({ value: author.value, label: author.value })) ?? [];
    const selected = yield* Effect.tryPromise({
      try: () =>
        multiselect({
          message: 'Sélectionnez les formes graphiques correspondantes au chercheur',
          options: opts,
        }),
      catch: cause => new Error('Erreur lors de la sélection de la forme graphique: ', { cause }),
    });
    const final = state.map(s => {
      if (s.authors.orcid === state.context?.id && selected.map.includes(s.authors.value)) {
    })
  });

const select_action = (
  state: IState,
  options: { value: string; label: string }[],
): Effect.Effect<string | symbol, Error, never> =>
  Effect.tryPromise({
    try: () =>
      select({
        message: 'Que souhaitez-vous faire ?',
        options,
      }),
    catch: cause => new Error("Erreur lors de la sélection de l'action: ", { cause }),
  });

const switcher = (action_id: string) =>
  Effect.gen(function* () {
    switch (action_id) {
      case 'Sélectionner un chercheur avec son ORCID':
        yield* set_ORCID();
        break;
      case 'Fiabiliser les formes graphiques':
        yield* set_graphical_forms();
        break;
      case 'Quitter l’application':
        yield* exit();
        break;
    }
  });

export const start = (file: string) =>
  Effect.gen(function* () {
    yield* loadState(file);
    const state = yield* Ref.get(yield* State);
    while (true) {
      //console.clear();
      const title = state.context ? `${state.context.label} (${state.context.id})` : 'OpenAlex';
      intro(`${color.bgCyan(color.black(` ${title} `))}\n`);
      const options = yield* build_actions_list();
      if (options) {
        const selected_action = yield* select_action(state, options);
        yield* switcher(selected_action.toString());
      }
    }
  });

Effect.runPromiseExit(
  start('state.json').pipe(Effect.provideServiceEffect(State, Ref.make({} as IState))),
);
