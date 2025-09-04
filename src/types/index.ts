import { Args } from './argv';
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

export {
  OpenalexSearchAuthorResult,
  OpenalexSearchAuthorsResponse,
  Args,
  QueryValue,
  Query,
};
