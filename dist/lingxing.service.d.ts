import { LingxingModuleOptions } from './types';
type PlainObject = Record<string, unknown>;
export declare class LingxingService {
    private readonly client;
    private readonly appId;
    private readonly appSecret;
    private readonly baseHost;
    private accessToken;
    private refreshTokenValue;
    private tokenExpiresAt;
    constructor(options: LingxingModuleOptions);
    get(routeName: string, params?: PlainObject): Promise<unknown>;
    post(routeName: string, data?: PlainObject): Promise<unknown>;
    private request;
    private extractBizData;
    private ensureAccessToken;
    private callGenerateAccessToken;
    private callRefreshToken;
    private callAuthEndpoint;
    private updateTokenState;
    private toAbsoluteUrl;
    private restQueryUrl;
    private generateSign;
    private encrypt;
    private isPlainObject;
    private formatError;
}
export {};
