# pnpm-lockfile-migrate
Update the tarball urls an/or integrity checksums, that some private enterprise `NPM` registries like Artifactory or Azure Artifact need, in a project's `pnpm-lock.yaml` file. 

## Use Case
You develop a project with packages from a private npm registry. The registry's information will be stored in the `pnpm-lock.yaml` file and commited to your codebase. But when trying to build the project in a `CI` pipeline with access to all the needed private packages but via a different private registry. Here `pnpm` might fail as `pnpm i` compares the content of the `pnpm-lock.yaml` with the information it retrieves from the registry and tarball URL and/or integrity checksum do not match. 

This script uses [@pnpm/lockfile-file](https://www.npmjs.com/package/@pnpm/lockfile-file) core package of `pnpm` to read the project's `pnpm-lock.yaml`, updates the relevant information, and saves the file again.

# Usage

## Executable
The migration of the script will need to be done before you run `pnpm i`. Therefore this plugin provides an executable that can be called before `pnpm i` will be executed. The script logs 

This script can be called with the following parameters:

1. `-d`, or `--directory` (mandatory) The folder containing your pnpm-lock.yaml file
2. `-s`, or `--scope` (mandatory) at least one scope 
3. `--noLog` (optional) if set no information will be logged to the console
4. `--noBackupFile` (optional) if set the script will not create a backup (saved under `pnpm-lock.bck.yaml`) of the lock file
5. `--debug` (optional) if set the log information will be augmented with further information . 

```
npx pnpm-lock-migrate -d . -s "@scope" -s "@another-scope"
```

This script reads the 

1. Reads the lock file
2. Identifies all packages (matching the globs) in the lock file
3. Retrieves the tarball URL and integrity value from the currently configured private registry.
4. Updates the relevant entries in the lock file
5. ... and saves the lock file for further processing through `pnpm i`

## Write your own script.
You can import the relevant function from the package to roll your own script. 

```
import {updateRegistryInformation} from "pnpm-lockfile-migrate";

...

asycn function process() {
  // this will update all the packages
  const count = await updateRegistryInformation("/my/path/to/the/project/");

  // this will update all the packages matching the globs
  const count2 = await updateRegistryInformation(
    "/my/path/to/the/project/", ["@scope/*", "@another-scope/*"]);

  // this will update all the packages matching the globs and provide a consol.log  
  // output of the process and create a backup file of the processed pnpm-lock.yaml 
  // file 
  const count3 = await updateRegistryInformation(
    "/my/path/to/the/project/", ["@scope/*", "@another-scope/*"], {
      log: true,
      backupLockfileL truem 
    });

  // count does give you the number of updated packages
}

process();
```
# Development
We use [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) to auto generate our `CHANGELOG.md`. Please make sure to prepend your commit messages with either `feat:`, `fix:` or `chore:`. 

# Building

Run `nx build pnpm-lockfile-migrate` to build the library.

# Linting

Run `nx lint pnpm-lockfile-migrate` to lint the code.

# Testing

Run `nx test pnpm-lockfile-migrate` to execute the unit tests via [Vitest](https://vitest.dev/).

# Publishing 
First make sure that you configure the correct version in `lib/package.json`. Then test the release by running:

```
pnpm run release:dry-run
``` 
This will check the version, generate a changelog entry based on the conventional commits, tests if the version has not been already tagged. 

If all changes look good you can trigger the release with: 

```
pnpm run release
```
