import type { RateLimiter } from 'effect';
import { OpenalexSearchAuthorResult, OpenalexResponse } from './openalex';

type QueryValue = string | number | boolean | Array<string | number | boolean> | undefined;

type Query = Record<string, QueryValue>;

interface Env {
  user_agent: string;
  rate_limit: RateLimiter.RateLimiter.Options;
}
interface Args {
  name?: string;
}

export { OpenalexSearchAuthorResult, OpenalexResponse, QueryValue, Query, Args, Env };
