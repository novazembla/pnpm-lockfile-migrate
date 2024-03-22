import { updateRegistryInformation } from './pnpm-lockfile-migrate';

describe('Testing Libraray', async () => {
  test('test', async () => {
    expect(typeof updateRegistryInformation).toBe('function');
  });
});
