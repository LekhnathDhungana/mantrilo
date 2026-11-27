import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const client = () => true;
const server = () => false;

// Static HTML cannot know a visitor's query string. Match that HTML on the first client render.
export function useHydrated() {
  return useSyncExternalStore(subscribe, client, server);
}
