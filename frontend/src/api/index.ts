import { config } from '../config';
import { httpApi } from './http';
import { mockApi } from './mock';

/** Single entry point: pages import `api` and never care whether it is mock or real. */
export const api = config.useMock ? mockApi : httpApi;
export * from './types';
