import { Inject, Injectable } from '@nestjs/common';
import axios, { AxiosInstance, Method } from 'axios';
import CryptoJS from 'crypto-js';
import md5 from 'md5';
import qs from 'qs';
import {
  DEFAULT_BASE_HOST,
  LINGXING_MODULE_OPTIONS,
} from './constants';
import {
  AccessTokenData,
  LingxingEnvelope,
  LingxingModuleOptions,
} from './types';

type PlainObject = Record<string, unknown>;

@Injectable()
export class LingxingService {
  private readonly client: AxiosInstance;
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly baseHost: string;

  private accessToken = '';
  private refreshTokenValue = '';
  private tokenExpiresAt = 0;

  constructor(
    @Inject(LINGXING_MODULE_OPTIONS)
    options: LingxingModuleOptions,
  ) {
    if (!options.appId || !options.appSecret) {
      throw new Error('LingxingModule 初始化失败：appId 和 appSecret 不能为空。');
    }

    this.appId = options.appId;
    this.appSecret = options.appSecret;
    this.baseHost = options.baseHost ?? DEFAULT_BASE_HOST;
    this.client = axios.create({
      timeout: options.timeout ?? 30_000,
    });
  }

  async get(routeName: string, params: PlainObject = {}): Promise<unknown> {
    return this.request(routeName, 'GET', params);
  }

  async post(routeName: string, data: PlainObject = {}): Promise<unknown> {
    return this.request(routeName, 'POST', data);
  }

  private async request(
    routeName: string,
    method: Method,
    payload: PlainObject,
  ): Promise<unknown> {
    if (!routeName || !routeName.trim()) {
      throw new Error('请求失败：接口路径 routeName 不能为空。');
    }

    const accessToken = await this.ensureAccessToken();

    const baseParam: Record<string, string | number> = {
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
        const response = await this.client.request<LingxingEnvelope<unknown>>({
          url: requestUrl,
          method: 'GET',
          params: {
            ...payload,
            ...baseParam,
          },
        });

        return this.extractBizData(response.data);
      }

      const response = await this.client.request<LingxingEnvelope<unknown>>({
        url: this.restQueryUrl(requestUrl, baseParam),
        method: upperMethod,
        data: payload,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return this.extractBizData(response.data);
    } catch (error) {
      throw new Error(
        `凌星接口调用失败（${upperMethod} ${routeName}）：${this.formatError(error)}`,
      );
    }
  }

  private extractBizData(body: LingxingEnvelope<unknown>): unknown {
    return body;
  }

  private async ensureAccessToken(): Promise<string> {
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
      } catch {
        // refresh token may be expired or single-use, fall back to fresh token request
      }
    }

    const tokenData = await this.callGenerateAccessToken();
    this.updateTokenState(tokenData);
    return this.accessToken;
  }

  private async callGenerateAccessToken(): Promise<AccessTokenData> {
    const path = '/api/auth-server/oauth/access-token';
    const body = await this.callAuthEndpoint(path, {
      appId: this.appId,
      appSecret: this.appSecret,
    });

    return body;
  }

  private async callRefreshToken(refreshToken: string): Promise<AccessTokenData> {
    const path = '/api/auth-server/oauth/refresh';
    const body = await this.callAuthEndpoint(path, {
      appId: this.appId,
      refreshToken,
    });

    return body;
  }

  private async callAuthEndpoint(
    path: string,
    params: Record<string, string>,
  ): Promise<AccessTokenData> {
    const url = this.restQueryUrl(this.toAbsoluteUrl(path), params);

    const response = await this.client.post<LingxingEnvelope<AccessTokenData>>(url);
    const body = response.data;
    const code = Number(body?.code);

    if (code !== 200 || !body?.data?.access_token) {
      const message =
        body?.message ??
        body?.msg ??
        `鉴权接口返回异常，状态码：${String(body?.code)}`;
      throw new Error(`凌星鉴权失败：${message}`);
    }

    return body.data;
  }

  private updateTokenState(tokenData: AccessTokenData): void {
    this.accessToken = tokenData.access_token;
    this.refreshTokenValue = tokenData.refresh_token ?? this.refreshTokenValue;

    const expiresInSeconds = Number(tokenData.expires_in);
    if (Number.isFinite(expiresInSeconds) && expiresInSeconds > 0) {
      this.tokenExpiresAt = Date.now() + expiresInSeconds * 1000;
      return;
    }

    // When API does not return expiration, keep a conservative default.
    this.tokenExpiresAt = Date.now() + 30 * 60 * 1000;
  }

  private toAbsoluteUrl(routeName: string): string {
    const normalizedRoute = routeName.startsWith('/')
      ? routeName
      : `/${routeName}`;
    return `${this.baseHost}${normalizedRoute}`;
  }

  private restQueryUrl(url: string, params: Record<string, unknown>): string {
    const paramsUrl = qs.stringify(params);
    return `${url}${paramsUrl ? '?' : ''}${paramsUrl}`;
  }

  private generateSign(
    params: Record<string, unknown>,
    appKey: string,
  ): string {
    const paramsArr = Object.keys(params).sort();
    const stringArr = paramsArr.map((key) => {
      const value = this.isPlainObject(params[key])
        ? JSON.stringify(params[key])
        : String(params[key]);
      return `${key}=${value}`;
    });

    const paramsUrl = stringArr.join('&');
    const upperUrl = md5(paramsUrl).toString().toUpperCase();
    return this.encrypt(upperUrl, appKey);
  }

  private encrypt(content: string, appKey: string): string {
    const key = CryptoJS.enc.Utf8.parse(appKey);
    return CryptoJS.AES.encrypt(content.trim(), key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    }).toString();
  }

  private isPlainObject(val: unknown): boolean {
    return (
      Object.prototype.toString.call(val) === '[object Object]' ||
      Array.isArray(val)
    );
  }

  private formatError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const responseData =
        typeof error.response?.data === 'string'
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
}
