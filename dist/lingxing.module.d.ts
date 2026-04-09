import { DynamicModule } from '@nestjs/common';
import { LingxingModuleAsyncOptions, LingxingModuleOptions } from './types';
export declare class LingxingModule {
    static forRoot(options: LingxingModuleOptions): DynamicModule;
    static forRootAsync(options: LingxingModuleAsyncOptions): DynamicModule;
}
