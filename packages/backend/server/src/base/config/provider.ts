import { ApplyType } from '../utils/types';
import { AFFiNEConfig } from './def';

/**
 * @example
 *
 * import { Config } from '@affine/server'
 *
 * class TestConfig {
 *   constructor(private readonly config: Config) {}
 *   test() {
 *     return this.config.env
 *   }
 * }
 */
export class Config extends ApplyType<AFFiNEConfig>() {}
