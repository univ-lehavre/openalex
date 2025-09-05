import {
  OpenalexSearchAuthorResult,
  OpenalexSearchAuthorsResponse,
} from './openalex';

type QueryValue =
  | string
  | number
  | boolean
  | Array<string | number | boolean>
  | undefined;

type Query = Record<string, QueryValue>;

interface Arguments {
  name?: string;
}

export {
  OpenalexSearchAuthorResult,
  OpenalexSearchAuthorsResponse,
  QueryValue,
  Query,
  Arguments,
};
