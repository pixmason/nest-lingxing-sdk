# @pixmason/nest-lingxing-sdk

NestJS 版LingXing OpenAPI SDK。

## 安装

### npm

```bash
npm install @pixmason/nest-lingxing-sdk
```

### pnpm

```bash
pnpm add @pixmason/nest-lingxing-sdk
```

### yarn

```bash
yarn add @pixmason/nest-lingxing-sdk
```

## 快速开始

### 1. 同步配置（forRoot）

```ts
import { Module } from '@nestjs/common'
import { LingxingModule } from '@pixmason/nest-lingxing-sdk'

@Module({
	imports: [
		LingxingModule.forRoot({
			appId: 'xxx',
			appSecret: 'xxx',
			timeout: 30000,
		}),
	],
})
export class AppModule {}
```

### 2. 异步配置（forRootAsync）

```ts
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { LingxingModule } from '@pixmason/nest-lingxing-sdk'

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		LingxingModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => ({
				appId: configService.get<string>('APP_ID')!,
				appSecret: configService.get<string>('APP_SECRET')!,
				timeout: Number(configService.get<string>('LINGXING_TIMEOUT') ?? 30000),
			}),
		}),
	],
})
export class AppModule {}
```

## 支持的调用方式

目前仅提供两种请求方法：

```ts
await lingxingService.get('/api/xxx', params)
await lingxingService.post('/api/xxx', data)
```

说明：

- SDK 会自动处理 access_token 获取与刷新。
- SDK 会自动完成签名。
- 返回值为凌星接口的完整响应对象（即原始 `data`）。

## 完整接入示例

```ts
import { Injectable } from '@nestjs/common'
import { LingxingService } from '@pixmason/nest-lingxing-sdk'

@Injectable()
export class DemoService {
	constructor(private readonly lingxingService: LingxingService) {}

	async getExample() {
		return this.lingxingService.get('/erp/sc/routing/data/local_inventory/category', {
			offset: 5,
		})
	}

	async postExample() {
		return this.lingxingService.post('/bd/sp/api/open/settlement/summary/list', {
			dateType: 1,
			startDate: '2026-01-01',
			endDate: '2026-01-31',
		})
	}
}
```

## .env 示例

```dotenv
APP_ID=Your_LINGXING_APP_ID
APP_SECRET=Your_LINGXING_APP_SECRET
LINGXING_TIMEOUT=30000
```

## 配置项

`LingxingModuleOptions` 支持以下字段：

- `appId: string` 必填，企业 AppID。
- `appSecret: string` 必填，企业 AppSecret。
- `baseHost?: string` 可选，默认 `https://openapi.lingxing.com`。
- `timeout?: number` 可选，请求超时毫秒数，默认 `30000`。

## 异常说明

SDK 会抛出错误信息，常见场景包括：

- 配置缺失（例如 `appId` 或 `appSecret` 为空）
- 鉴权失败
- 网络异常或业务接口调用异常
