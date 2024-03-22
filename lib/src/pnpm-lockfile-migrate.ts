import {
  LockfileResolution,
  TarballResolution,
  existsNonEmptyWantedLockfile,
  readWantedLockfile,
  writeWantedLockfile,
} from '@pnpm/lockfile-file';
import { exec } from 'child_process';
import { copyFileSync, existsSync } from 'fs';
import { isAbsolute, join } from 'path';

function execShellCommand(cmd: string) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      }
      resolve(stdout ? stdout : stderr);
    });
  });
}

type PackageInfo = { key: string; packageWithVersion: string };

function isResolutionWithIntegrity(
  test: LockfileResolution
): test is TarballResolution | { integrity: string } {
  return (test as { integrity: string }).integrity !== undefined;
}

function isResolutionWithTarball(
  test: LockfileResolution
): test is TarballResolution {
  return (test as TarballResolution).tarball !== undefined;
}

function isResolutionWithType(
  test: LockfileResolution
): test is TarballResolution {
  return (test as TarballResolution).type !== undefined;
}

/**
 * This function updates a pnpm-lock.yaml file with the package information from the registry.
 *
 * 1. Reads the projects pnpm-lock.yaml
 * 2. Scans it for packages (that match the given scopes)
 * 3. Fetches the packages information from the currently configured registry
 * 4. Updates the content of pnpm-lock.yaml
 * 5. ... and saves it back to the disk.
 *
 * @param {string} directory The absolute or relative path to the package. Reads the pnpm-lock.yaml file from the root of the package.
 * @param {Object} [options]  Further options to control the migration
 * @param {Array.<string>} [options.scopes] The scopes of the packages that should be updated. E.g. ["@yourscope"]
 * @param  {boolean} [options.log] If true extensive information will be written via console.log(...)
 * @param  {boolean} [options.backupLockfile] If true a copy of the lock file will be written to pnpm-lock.bck.yaml
 */
export async function updateRegistryInformation(
  directory: string,
  scopes: string | string[],
  options: {
    log?: boolean;
    debug?: boolean;
    verbose?: boolean;
    backupLockfile?: boolean;
  }
) {
  const packageScopes = [...scopes];

  let dir = directory;
  let count = 0;

  if (!isAbsolute(directory)) {
    dir = join(process.cwd(), directory);
  }

  if (!Array.isArray(packageScopes) || packageScopes.length === 0) {
    throw Error(
      'Please provide at least one scope to identify the packages that need to be processed.'
    );
  }
  if (options?.backupLockfile) {
    const filePath = join(dir, 'pnpm-lock.yaml');

    if (existsSync(filePath)) {
      copyFileSync(filePath, filePath.replace('.yaml', '.bck.yaml'));
      console.log(
        '\n\n++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++'
      );
      console.log(
        `Created lock file backup ${filePath.replace('.yaml', '.bck.yaml')}`
      );
    }
  }

  if (options?.log) {
    console.error(dir);
    console.log(
      '\n\n++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++'
    );
    console.log('Check if pnpm-lock.yaml is present ...');
  }
  if (await existsNonEmptyWantedLockfile(dir)) {
    if (options?.log) {
      console.log(' ... present');
      console.log(
        '\n++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++'
      );
      console.log('Read pnpm-lock.yaml ...');
    }
    const lockFile = await readWantedLockfile(dir, {
      ignoreIncompatible: true,
      useGitBranchLockfile: false,
      mergeGitBranchLockfiles: false,
    });
    if (options?.log) {
      console.log('  ... read');
      console.log(
        '\n++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++'
      );
    }
    if (!lockFile) {
      throw Error(`could not parse pnpm-lock.yaml in ${dir}`);
    }

    const matchedPackages = Object.keys(lockFile['packages'] ?? {})
      .map((pkg) => {
        const packageName = pkg.slice(1).split('(')[0];

        const pos = packageName.lastIndexOf('/');
        const packageWithVersion = `${packageName.substring(
          0,
          pos
        )}@${packageName.substring(pos + 1)}`;

        const packageInfo: PackageInfo = {
          key: pkg,
          packageWithVersion,
        };
        return packageInfo;
      })
      .filter(
        (pkgInfo) =>
          !!packageScopes.find((scope) =>
            pkgInfo.packageWithVersion.startsWith(scope)
          )
      );

    if (options?.log) {
      console.log(`Identified ${matchedPackages?.length} packages`);
    }
    await Promise.all(
      matchedPackages.map(async (pkgInfo) => {
        const out = [
          '',
          '',
          '++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++',
        ];
        if (options?.debug) {
          out.push(pkgInfo.key);
        }
        out.push(pkgInfo.packageWithVersion);

        if (options?.debug) {
          out.push(
            '++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++'
          );

          out.push('CURRRENT:');
          out.push(
            JSON.stringify(
              lockFile['packages']?.[pkgInfo.key].resolution,
              undefined,
              2
            )
          );

          out.push(
            '++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++'
          );
        }

        const result = await execShellCommand(
          `pnpm view "${pkgInfo.packageWithVersion}" dist --json`
        ).then((response) => {
          if (typeof response === 'string') {
            return JSON.parse(response);
          } else {
            throw Error(
              'Error: \'pnpm view "${packageWithVersion}" dist --json\' did not resolve package'
            );
          }
        });

        if (options?.debug) {
          out.push('PNPM VIEW RESULT:');
          out.push(
            JSON.stringify(
              {
                integrity: result?.integrity,
                tarball: result?.tarball,
                type: result?.type,
              },
              undefined,
              2
            )
          );
        }

        if (lockFile['packages']?.[pkgInfo.key].resolution) {
          let updated = false;

          if (
            isResolutionWithIntegrity(
              lockFile['packages'][pkgInfo.key].resolution
            ) &&
            (lockFile['packages'][pkgInfo.key].resolution as TarballResolution)
              .integrity !== result?.integrity
          ) {
            if (result?.integrity) {
              (
                lockFile['packages'][pkgInfo.key]
                  .resolution as TarballResolution
              ).integrity = result?.integrity;
            } else {
              delete (
                lockFile['packages'][pkgInfo.key]
                  .resolution as TarballResolution
              ).integrity;
            }
            updated = true;
          }

          if (
            isResolutionWithTarball(
              lockFile['packages'][pkgInfo.key].resolution
            ) &&
            (lockFile['packages'][pkgInfo.key].resolution as TarballResolution)
              .tarball !== result?.tarball
          ) {
            if (result?.tarball) {
              (
                lockFile['packages'][pkgInfo.key]
                  .resolution as TarballResolution
              ).tarball = result?.tarball;
            } else {
              delete (
                lockFile['packages'][pkgInfo.key]
                  .resolution as Partial<TarballResolution>
              ).tarball;
            }
            updated = true;
          }

          if (
            isResolutionWithType(
              lockFile['packages'][pkgInfo.key].resolution
            ) &&
            (lockFile['packages'][pkgInfo.key].resolution as TarballResolution)
              .type !== result?.type &&
            // we don't want to mess with around git or directory resolutions
            !['directory', 'git'].includes(result?.resolution)
          ) {
            if (result?.type) {
              (
                lockFile['packages'][pkgInfo.key]
                  .resolution as TarballResolution
              ).type = result?.type;
            } else {
              delete (
                lockFile['packages'][pkgInfo.key]
                  .resolution as Partial<TarballResolution>
              ).type;
            }
            updated = true;
          }

          if (updated) {
            count += 1;
          } else {
            out.join('No changes detected');
          }
        }

        if (options?.log) {
          console.log(out.join('\n'));
        }
      })
    );
    if (options?.log) {
      console.log(
        '\n\n++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++'
      );
    }

    if (count > 0) {
      if (options?.log) {
        console.log('Write new pnpm-lock.yaml ...');
      }
      await writeWantedLockfile(dir, lockFile);

      if (options?.log) {
        console.log('  ... written');
        console.log(
          '\n\n++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++'
        );
        console.log(`Updated ${count} packages.`);
        console.log(
          '++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++'
        );
      }
    } else {
      console.log('\n\npnpm-lock.yaml has not been changed.');
      console.log(
        '++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++'
      );
    }
  } else {
    throw Error(`Could not find pnpm-lock.yaml in ${dir}`);
  }
  return count;
}
