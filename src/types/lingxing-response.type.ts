export interface LingxingEnvelope<T> {
  code?: number | string;
  data?: T;
  msg?: string;
  message?: string;
  throwable?: unknown;
  [key: string]: unknown;
}

export interface AccessTokenData {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  [key: string]: unknown;
}
