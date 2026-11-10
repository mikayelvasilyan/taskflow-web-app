import { setupServer } from 'msw/node';

/** Tests register handlers per case with server.use(...). Unhandled requests fail the test. */
export const server = setupServer();
