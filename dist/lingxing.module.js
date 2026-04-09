"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var LingxingModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LingxingModule = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("./constants");
const lingxing_service_1 = require("./lingxing.service");
let LingxingModule = LingxingModule_1 = class LingxingModule {
    static forRoot(options) {
        return {
            module: LingxingModule_1,
            providers: [
                {
                    provide: constants_1.LINGXING_MODULE_OPTIONS,
                    useValue: options,
                },
                lingxing_service_1.LingxingService,
            ],
            exports: [lingxing_service_1.LingxingService],
        };
    }
    static forRootAsync(options) {
        const optionsProvider = {
            provide: constants_1.LINGXING_MODULE_OPTIONS,
            useFactory: options.useFactory,
            inject: options.inject ?? [],
        };
        return {
            module: LingxingModule_1,
            imports: options.imports ?? [],
            providers: [optionsProvider, lingxing_service_1.LingxingService],
            exports: [lingxing_service_1.LingxingService],
        };
    }
};
exports.LingxingModule = LingxingModule;
exports.LingxingModule = LingxingModule = LingxingModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({})
], LingxingModule);
