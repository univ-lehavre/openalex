import {
  intro,
  group,
  log,
  cancel,
  outro,
  text,
  multiselect,
  Option,
} from '@clack/prompts';
import process from 'node:process';
import { Effect } from 'effect';
import color from 'picocolors';
import { PromptError } from './errors';

const prepare = (title: string): void => {
  console.clear();
  intro(`${color.bgCyan(color.black(` ${title} `))}`);
};

const finish = (title: string): void =>
  outro(`${color.bgGreen(color.black(` ${title} `))}`);

const onCancel = (): void => {
  cancel('Opération annulée.');
  process.exit(0);
};

const who = (): Effect.Effect<{ name: string }, PromptError, never> =>
  Effect.tryPromise({
    try: () =>
      group(
        {
          name: () =>
            text({
              message: 'Précisez le nom d’un·e chercheur·euse',
              placeholder: 'Ex: Marie Curie',
              validate(value) {
                if (value.length === 0) return `Value is required!`;
              },
            }),
        },
        {
          onCancel,
        }
      ),
    catch: error =>
      new PromptError(`Impossible to set parameters`, { cause: error }),
  });

const multiple = (message: string, options: Option<string>[]) =>
  Effect.tryPromise({
    try: () =>
      group(
        {
          selection: () =>
            multiselect({
              message,
              options,
              required: true,
            }),
        },
        {
          onCancel,
        }
      ),
    catch: error =>
      new PromptError(`Impossible to set parameters`, { cause: error }),
  });

export { prepare, finish, who, multiple, log };
