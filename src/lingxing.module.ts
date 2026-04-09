import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { LINGXING_MODULE_OPTIONS } from './constants';
import {
  LingxingModuleAsyncOptions,
  LingxingModuleOptions,
} from './types';
import { LingxingService } from './lingxing.service';

@Global()
@Module({})
export class LingxingModule {
  static forRoot(options: LingxingModuleOptions): DynamicModule {
    return {
      module: LingxingModule,
      providers: [
        {
          provide: LINGXING_MODULE_OPTIONS,
          useValue: options,
        },
        LingxingService,
      ],
      exports: [LingxingService],
    };
  }

  static forRootAsync(options: LingxingModuleAsyncOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: LINGXING_MODULE_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject ?? [],
    };

    return {
      module: LingxingModule,
      imports: options.imports ?? [],
      providers: [optionsProvider, LingxingService],
      exports: [LingxingService],
    };
  }
}
