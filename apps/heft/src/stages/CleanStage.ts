// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as path from 'path';
import * as glob from 'glob';
import * as globEscape from 'glob-escape';
import { AsyncSeriesBailHook } from 'tapable';
import { FileSystem, LegacyAdapters } from '@rushstack/node-core-library';

import { StageBase, StageHooksBase, IStageContext } from './StageBase';
import { Async } from '../utilities/Async';
import { HeftConfiguration } from '../configuration/HeftConfiguration';
import { LoggingManager } from '../pluginFramework/logging/LoggingManager';
import { HeftConfigFiles } from '../utilities/HeftConfigFiles';

/**
 * @public
 */
export class CleanStageHooks extends StageHooksBase<ICleanStageProperties> {
  public readonly deletePath: AsyncSeriesBailHook<string> = new AsyncSeriesBailHook<string>(['pathToDelete']);
}

/**
 * @public
 */
export interface ICleanStageProperties {
  deleteCache: boolean;
  pathsToDelete: Set<string>;
}

export interface ICleanStageOptions {
  deleteCache?: boolean;
}

/**
 * @public
 */
export interface ICleanStageContext extends IStageContext<CleanStageHooks, ICleanStageProperties> {}

export interface ICleanConfigurationJson {
  pathsToDelete: string[];
}

export class CleanStage extends StageBase<CleanStageHooks, ICleanStageProperties, ICleanStageOptions> {
  public constructor(heftConfiguration: HeftConfiguration, loggingManager: LoggingManager) {
    super(heftConfiguration, loggingManager, CleanStageHooks);
  }

  protected async getDefaultStagePropertiesAsync(
    options: ICleanStageOptions
  ): Promise<ICleanStageProperties> {
    let cleanConfigurationFile: ICleanConfigurationJson | undefined = undefined;
    try {
      cleanConfigurationFile = await HeftConfigFiles.cleanConfigurationFileLoader.loadConfigurationFileAsync(
        path.resolve(this.heftConfiguration.buildFolder, '.heft', 'clean.json')
      );
    } catch (e) {
      if (!FileSystem.isNotExistError(e)) {
        throw e;
      }
    }

    return {
      deleteCache: false,
      ...options,
      pathsToDelete: new Set<string>(cleanConfigurationFile?.pathsToDelete)
    };
  }

  protected async executeInnerAsync(): Promise<void> {
    const resolvedPathsToDelete: string[] = [];
    for (const pathToDelete of this.stageProperties.pathsToDelete) {
      const resolvedPaths: string[] = await this._resolvePathAsync(
        pathToDelete,
        this.heftConfiguration.buildFolder
      );
      resolvedPathsToDelete.push(...resolvedPaths);
    }

    if (this.stageProperties.deleteCache) {
      resolvedPathsToDelete.push(this.heftConfiguration.buildCacheFolder);
    }

    await Async.forEachLimitAsync(resolvedPathsToDelete, 100, (pathToDelete) =>
      this.stageHooks.deletePath.promise(pathToDelete)
    );

    this.globalTerminal.writeLine(`Deleted ${this.stageProperties.pathsToDelete.size} paths`);
  }

  private async _resolvePathAsync(globPattern: string, buildFolder: string): Promise<string[]> {
    if (globEscape(globPattern) !== globPattern) {
      const expandedGlob: string[] = await LegacyAdapters.convertCallbackToPromise(glob, globPattern, {
        cwd: buildFolder
      });

      const result: string[] = [];
      for (const pathFromGlob of expandedGlob) {
        result.push(path.resolve(buildFolder, pathFromGlob));
      }

      return result;
    } else {
      return [path.resolve(buildFolder, globPattern)];
    }
  }
}
