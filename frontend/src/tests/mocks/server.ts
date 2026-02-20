/**
 * MSW Server instance for Node.js test environment (Vitest/jsdom).
 */
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
