import { ModuleMetadata } from '@nestjs/common';
export interface LingxingModuleOptions {
    appId: string;
    appSecret: string;
    baseHost?: string;
    timeout?: number;
}
export interface LingxingModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    inject?: any[];
    useFactory: (...args: any[]) => Promise<LingxingModuleOptions> | LingxingModuleOptions;
}
