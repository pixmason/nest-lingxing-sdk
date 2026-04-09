"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LingxingService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const crypto_js_1 = __importDefault(require("crypto-js"));
const md5_1 = __importDefault(require("md5"));
const qs_1 = __importDefault(require("qs"));
const constants_1 = require("./constants");
let LingxingService = class LingxingService {
    constructor(options) {
        this.accessToken = '';
        this.refreshTokenValue = '';
        this.tokenExpiresAt = 0;
        if (!options.appId || !options.appSecret) {
            throw new Error('LingxingModule 初始化失败：appId 和 appSecret 不能为空。');
        }
        this.appId = options.appId;
        this.appSecret = options.appSecret;
        this.baseHost = options.baseHost ?? constants_1.DEFAULT_BASE_HOST;
        this.client = axios_1.default.create({
            timeout: options.timeout ?? 30_000,
        });
    }
    async get(routeName, params = {}) {
        return this.request(routeName, 'GET', params);
    }
    async post(routeName, data = {}) {
        return this.request(routeName, 'POST', data);
    }
    async request(routeName, method, payload) {
        if (!routeName || !routeName.trim()) {
            throw new Error('请求失败：接口路径 routeName 不能为空。');
        }
        const accessToken = await this.ensureAccessToken();
        const baseParam = {
            access_token: accessToken,
            app_key: this.appId,
            timestamp: Math.round(Date.now() / 1000),
        };
        const signParams = {
            ...baseParam,
            ...payload,
        };
        const sign = this.generateSign(signParams, this.appId);
        baseParam.sign = sign;
        const requestUrl = this.toAbsoluteUrl(routeName);
        const upperMethod = method.toUpperCase();
        try {
            if (upperMethod === 'GET') {
                const response = await this.client.request({
                    url: requestUrl,
                    method: 'GET',
                    params: {
                        ...payload,
                        ...baseParam,
                    },
                });
                return this.extractBizData(response.data);
            }
            const response = await this.client.request({
                url: this.restQueryUrl(requestUrl, baseParam),
                method: upperMethod,
                data: payload,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            return this.extractBizData(response.data);
        }
        catch (error) {
            throw new Error(`凌星接口调用失败（${upperMethod} ${routeName}）：${this.formatError(error)}`);
        }
    }
    extractBizData(body) {
        return body;
    }
    async ensureAccessToken() {
        const now = Date.now();
        const refreshBufferMs = 60_000;
        if (this.accessToken && now < this.tokenExpiresAt - refreshBufferMs) {
            return this.accessToken;
        }
        if (this.refreshTokenValue) {
            try {
                const refreshed = await this.callRefreshToken(this.refreshTokenValue);
                this.updateTokenState(refreshed);
                return this.accessToken;
            }
            catch {
            }
        }
        const tokenData = await this.callGenerateAccessToken();
        this.updateTokenState(tokenData);
        return this.accessToken;
    }
    async callGenerateAccessToken() {
        const path = '/api/auth-server/oauth/access-token';
        const body = await this.callAuthEndpoint(path, {
            appId: this.appId,
            appSecret: this.appSecret,
        });
        return body;
    }
    async callRefreshToken(refreshToken) {
        const path = '/api/auth-server/oauth/refresh';
        const body = await this.callAuthEndpoint(path, {
            appId: this.appId,
            refreshToken,
        });
        return body;
    }
    async callAuthEndpoint(path, params) {
        const url = this.restQueryUrl(this.toAbsoluteUrl(path), params);
        const response = await this.client.post(url);
        const body = response.data;
        const code = Number(body?.code);
        if (code !== 200 || !body?.data?.access_token) {
            const message = body?.message ??
                body?.msg ??
                `鉴权接口返回异常，状态码：${String(body?.code)}`;
            throw new Error(`凌星鉴权失败：${message}`);
        }
        return body.data;
    }
    updateTokenState(tokenData) {
        this.accessToken = tokenData.access_token;
        this.refreshTokenValue = tokenData.refresh_token ?? this.refreshTokenValue;
        const expiresInSeconds = Number(tokenData.expires_in);
        if (Number.isFinite(expiresInSeconds) && expiresInSeconds > 0) {
            this.tokenExpiresAt = Date.now() + expiresInSeconds * 1000;
            return;
        }
        this.tokenExpiresAt = Date.now() + 30 * 60 * 1000;
    }
    toAbsoluteUrl(routeName) {
        const normalizedRoute = routeName.startsWith('/')
            ? routeName
            : `/${routeName}`;
        return `${this.baseHost}${normalizedRoute}`;
    }
    restQueryUrl(url, params) {
        const paramsUrl = qs_1.default.stringify(params);
        return `${url}${paramsUrl ? '?' : ''}${paramsUrl}`;
    }
    generateSign(params, appKey) {
        const paramsArr = Object.keys(params).sort();
        const stringArr = paramsArr.map((key) => {
            const value = this.isPlainObject(params[key])
                ? JSON.stringify(params[key])
                : String(params[key]);
            return `${key}=${value}`;
        });
        const paramsUrl = stringArr.join('&');
        const upperUrl = (0, md5_1.default)(paramsUrl).toString().toUpperCase();
        return this.encrypt(upperUrl, appKey);
    }
    encrypt(content, appKey) {
        const key = crypto_js_1.default.enc.Utf8.parse(appKey);
        return crypto_js_1.default.AES.encrypt(content.trim(), key, {
            mode: crypto_js_1.default.mode.ECB,
            padding: crypto_js_1.default.pad.Pkcs7,
        }).toString();
    }
    isPlainObject(val) {
        return (Object.prototype.toString.call(val) === '[object Object]' ||
            Array.isArray(val));
    }
    formatError(error) {
        if (axios_1.default.isAxiosError(error)) {
            const responseData = typeof error.response?.data === 'string'
                ? error.response.data
                : JSON.stringify(error.response?.data ?? {});
            return error.message
                ? `${error.message}，响应：${responseData}`
                : `未知网络错误，响应：${responseData}`;
        }
        if (error instanceof Error) {
            return error.message;
        }
        return String(error);
    }
};
exports.LingxingService = LingxingService;
exports.LingxingService = LingxingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(constants_1.LINGXING_MODULE_OPTIONS)),
    __metadata("design:paramtypes", [Object])
], LingxingService);
