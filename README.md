# pnpm-lockfile-migrate
Updates in a project's `pnpm-lock.yaml` file the tarball URLs and/or integrity checksums that some private enterprise NPM registries like Artifactory or Azure Artifacts require.

## Use Case
You develop a project with packages from a private npm registry. The registry's information is stored in the `pnpm-lock.yaml` file and committed to your codebase. However, when trying to build the project in a CI pipeline with access to all the needed private packages, but via a different private registry, `pnpm` might fail. This is because `pnpm install` compares the content of the `pnpm-lock.yaml` with the information it retrieves from the registry, and discrepancies in the tarball URL and/or integrity checksum can occur.

This script uses the [@pnpm/lockfile-file](https://www.npmjs.com/package/@pnpm/lockfile-file) core package of `pnpm` to read the project's `pnpm-lock.yaml`, update the relevant information, and save the file again.

## Usage

### Executable
The migration script should be run before `pnpm install`. Therefore, this plugin provides an executable that can be called prior to executing `pnpm i`. The script logs its actions to the console by default.

The script can be called with the following parameters:

1. `-d` or `--directory` (mandatory): The folder containing your `pnpm-lock.yaml` file.
2. `-s` or `--scope` (mandatory): At least one scope.
3. `--noLog` (optional): If set, no information will be logged to the console.
4. `--noBackupFile` (optional): If set, the script will not create a backup (saved under `pnpm-lock.bck.yaml`) of the lock file.
5. `--debug` (optional): If set, the log information will include additional details.

```bash
npx pnpm-lock-migrate -d . -s "@scope" -s "@another-scope"
```

This script reads the 

1. Reads the lock file. 
2. Identifies all packages (matching the scopes) in the lock file. 
3. Retrieves the tarball URL and/or integrity value from the currently configured private registry. 
4. Updates the relevant entries in the lock file. 
5. Saves the lock file for further processing through `pnpm i`. 

## Write your own script.
You can import the relevant function from the package to roll your own script. 

```javascript
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

```bash
pnpm run release:dry-run
``` 
This will check the version, generate a changelog entry based on the conventional commits, tests if the version has not been already tagged. 

If all changes look good you can trigger the release with: 

```bash
pnpm run release
```
