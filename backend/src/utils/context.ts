import { AsyncLocalStorage } from 'async_hooks';
import { DEFAULT_USER_ID } from '../config/constants';

export const requestContext = new AsyncLocalStorage<{ req: any }>();

export function getCurrentUserId(): string {
  const store = requestContext.getStore();
  if (!store || !store.req) {
    return DEFAULT_USER_ID;
  }
  const req = store.req;
  // If the logged-in user is an admin and provides a target userId query param,
  // resolve queries to that target user to allow administrative dashboard inspections.
  if (req.user?.role === 'admin' && req.query?.userId) {
    return String(req.query.userId);
  }
  return req.user?.id || DEFAULT_USER_ID;
}
