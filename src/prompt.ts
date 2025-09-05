import { intro, text, group, cancel, outro } from '@clack/prompts';
import process from 'node:process';
import { Effect } from 'effect';
import color from 'picocolors';

const prepare = (title: string) => {
  console.clear();
  intro(`${color.bgCyan(color.black(` ${title} `))}`);
};

const finish = (title: string) =>
  outro(`${color.bgGreen(color.black(` ${title} `))}`);

const onCancel = () => {
  cancel('Opération annulée.');
  process.exit(0);
};

const who = () =>
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
    catch: error => new Error(`Impossible to set parameters`, { cause: error }),
  });

export { prepare, finish, who };
