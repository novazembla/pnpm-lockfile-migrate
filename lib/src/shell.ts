#!/usr/bin/env node

import { Command } from '@commander-js/extra-typings';

import { updateRegistryInformation } from './pnpm-lockfile-migrate';

const cli = new Command()
  .requiredOption(
    '-d, --directory <directory>',
    'the absolute or relative path to your project'
  )
  .requiredOption('-s, --scopes <scopes...>', 'the scope or scopes of the packages that should be updated.')
  .option('--debug', 'if set the logs will give detail debug information')
  .option('--noLog', 'if set the log information will not be printed to the console')
  .option('--noBackupFile', 'if set no backup of the lock file will be safed')
  .parse();

const options = cli.opts();

async function main() {
  await updateRegistryInformation(options.directory, options.scopes, {
    log: !options.noLog,
    backupLockfile: !options.noBackupFile,
    debug: options.debug,
  });
}

try {
  main();  
} catch(e) {
  console.log(e);
}
