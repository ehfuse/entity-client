# EntityServerApi

현재 문서는 /home/ehfuse/npm/entity-client/src/EntityServerApi.ts 와 /home/ehfuse/npm/entity-client/src/mixins/server 기준으로 정리했습니다.

## 개요

EntityServerApi는 다음 영역을 포함합니다.

- 헬스체크 및 인증
- 엔티티 CRUD / 트랜잭션
- 파일 스토리지
- SMTP
- 유틸리티
- 관리자 API
- 푸시 관련 엔티티 헬퍼

표의 메서드명을 누르면 문서 하단의 상세 예제로 이동합니다.

## 헬스체크 / 인증

| 클라이언트 메서드 | HTTP | 경로 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| [checkHealth](#checkhealth) | GET | /v1/health | 서버 상태와 패킷 암호화 활성 여부 확인 | `bootstrapAuth=true`면 세션 부트스트랩까지 수행 |
| [login](#login) | POST | /v1/auth/login | 로그인 | 성공 시 내부 토큰 저장 |
| [tokenRefresh](#tokenrefresh) | POST | /v1/auth/token_refresh | HttpOnly refresh cookie 기반 토큰 재발급 | 내부 토큰 갱신 |
| [refreshToken](#refreshtoken) | POST | /v1/auth/refresh | refresh token 값으로 토큰 재발급 | 인자 없으면 `tokenRefresh()` 사용 |
| [logout](#logout) | POST | /v1/auth/logout | 로그아웃 | 내부 토큰과 health tick 정리 |
| [me](#me) | GET | /v1/auth/me | 현재 로그인 사용자 조회 | - |
| [withdraw](#withdraw) | POST | /v1/auth/withdraw | 회원 탈퇴 | `passwd` 전달 가능 |

## 트랜잭션

### 활성 트랜잭션을 내부 상태에 보관하는 메서드

| 클라이언트 메서드 | HTTP | 경로 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| [transStart](#transstart) | POST | /v1/transaction/start | 트랜잭션 시작 | `activeTxId` 저장 |
| [transCommit](#transcommit) | POST | /v1/transaction/commit/:transactionId | 트랜잭션 커밋 | 인자가 없으면 `activeTxId` 사용 |
| [transRollback](#transrollback) | POST | /v1/transaction/rollback/:transactionId | 트랜잭션 롤백 | 인자가 없으면 `activeTxId` 사용 |

### transactionId를 직접 넘기는 메서드

| 클라이언트 메서드 | HTTP | 경로 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| [transactionStart](#transactionstart) | POST | /v1/transaction/start | 트랜잭션 시작 | `transStart`와 같은 라우트, 내부 상태 저장 없음 |
| [transactionCommit](#transactioncommit) | POST | /v1/transaction/commit/:transactionId | 지정 트랜잭션 커밋 | - |
| [transactionRollback](#transactionrollback) | POST | /v1/transaction/rollback/:transactionId | 지정 트랜잭션 롤백 | - |

## 엔티티 CRUD

| 클라이언트 메서드 | HTTP | 경로 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| [meta](#meta) | POST | /v1/entity/:entity/meta | 엔티티 설정 메타데이터 조회 | - |
| [validate](#validate) | POST | /v1/entity/:entity/validate | 저장 없이 데이터 검증 | - |
| [get](#get) | GET | /v1/entity/:entity/:seq | 단건 조회 | `skipHooks` 옵션 지원 |
| [find](#find) | POST | /v1/entity/:entity/find | 조건 단건 조회 | `skipHooks` 옵션 지원 |
| [list](#list) | POST | /v1/entity/:entity/list | 목록 조회 | page, limit, fields, orderBy, conditions 지원 |
| [count](#count) | POST | /v1/entity/:entity/count | 조건 건수 조회 | - |
| [query](#query) | POST | /v1/entity/:entity/query | 커스텀 SQL 조회 | SELECT 전용 |
| [submit](#submit) | POST | /v1/entity/:entity/submit | 생성 또는 수정 | `transactionId`, `skipHooks` 지원 |
| [delete](#delete) | POST | /v1/entity/:entity/delete/:seq | 삭제 | `hard`, `skipHooks`, `transactionId` 지원 |
| [history](#history) | GET | /v1/entity/:entity/history/:seq | 변경 이력 조회 | page, limit 지원 |
| [rollback](#rollback) | POST | /v1/entity/:entity/rollback/:historySeq | 특정 이력 시점으로 롤백 | - |

## 파일

`file*` 메서드와 동일한 동작을 하는 `storage*` 별칭도 함께 제공합니다. `EntityAppServerApi`는 `EntityServerApi`를 상속하므로 동일하게 사용할 수 있습니다.

| 클라이언트 메서드 | HTTP | 경로 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| [fileUpload](#fileupload) | POST | /v1/files/:entity/upload | 파일 업로드 | `file`, `ref_seq`, `is_public` 전송 |
| [fileDownload](#filedownload) | POST | /v1/files/:entity/download/:uuid | 파일 다운로드 | `ArrayBuffer` 반환 |
| [fileDelete](#filedelete) | POST | /v1/files/:entity/delete/:uuid | 파일 삭제 | - |
| [fileList](#filelist) | POST | /v1/files/:entity/list | 엔티티 연결 파일 목록 조회 | `refSeq` 옵션 지원 |
| [fileMeta](#filemeta) | POST | /v1/files/:entity/meta/:uuid | 파일 메타 조회 | - |
| [fileToken](#filetoken) | POST | /v1/files/token/:uuid | 비공개 파일 접근 토큰 발급 | - |
| [fileViewUrl](#fileviewurl) | - | /v1/files/:uuid | 인라인 보기 또는 다운로드 URL 생성 | `download=true` 쿼리 조합만 수행 |
| [fileUrl](#fileurl) | - | /v1/files/:uuid | 인라인 보기 URL 생성 | 네트워크 요청 없음 |
| [storageUpload](#storageupload) | POST | /v1/files/:entity/upload | 스토리지 업로드 별칭 | `fileUpload()`와 동일 |
| [storageDownload](#storagedownload) | POST | /v1/files/:entity/download/:uuid | 스토리지 다운로드 별칭 | `fileDownload()`와 동일 |
| [storageDelete](#storagedelete) | POST | /v1/files/:entity/delete/:uuid | 스토리지 삭제 별칭 | `fileDelete()`와 동일 |
| [storageList](#storagelist) | POST | /v1/files/:entity/list | 스토리지 목록 별칭 | `fileList()`와 동일 |
| [storageMeta](#storagemeta) | POST | /v1/files/:entity/meta/:uuid | 스토리지 메타 별칭 | `fileMeta()`와 동일 |
| [storageToken](#storagetoken) | POST | /v1/files/token/:uuid | 스토리지 토큰 별칭 | `fileToken()`와 동일 |
| [storageViewUrl](#storageviewurl) | - | /v1/files/:uuid | 스토리지 뷰 URL 별칭 | `fileViewUrl()`와 동일 |
| [storageDownloadUrl](#storagedownloadurl) | - | /v1/files/:uuid?download=true | 스토리지 다운로드 URL 생성 | 문자열 조합만 수행 |
| [storageUrl](#storageurl) | - | /v1/files/:uuid | 스토리지 인라인 URL 별칭 | `fileUrl()`와 동일 |

## SMTP

| 클라이언트 메서드 | HTTP | 경로 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| [smtpSend](#smtpsend) | POST | /v1/smtp/send | 메일 발송 | - |
| [smtpStatus](#smtpstatus) | POST | /v1/smtp/status/:seq | 발송 상태 조회 | - |
| [smtpTemplatePreview](#smtptemplatepreview) | GET | /v1/smtp/template/:templatePath | 템플릿 HTML 미리보기 | `fetch()`로 텍스트 반환 |

## 유틸리티

### 주소

| 클라이언트 메서드 | HTTP | 경로 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| [addressSido](#addresssido) | GET | /v1/utils/address/sido | 시도 목록 조회 | 인증 없이 호출 |
| [addressSigungu](#addresssigungu) | GET | /v1/utils/address/sigungu | 시군구 목록 조회 | `sido` 쿼리 필요 |
| [addressDong](#addressdong) | GET | /v1/utils/address/dong | 동 목록 조회 | `sido`, `sigungu` 쿼리 필요 |
| [addressClean](#addressclean) | GET | /v1/utils/address/clean | 주소 정제 | `q` 쿼리 필요 |

### QR / 바코드 / PDF 변환

| 클라이언트 메서드 | HTTP | 경로 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| [qrcode](#qrcode) | POST | /v1/utils/qrcode | QR PNG 생성 | `ArrayBuffer` 반환 |
| [qrcodeBase64](#qrcodebase64) | POST | /v1/utils/qrcode/base64 | QR data URI 반환 | JSON 응답 |
| [qrcodeText](#qrcodetext) | POST | /v1/utils/qrcode/text | QR ASCII 텍스트 반환 | JSON 응답 |
| [barcode](#barcode) | POST | /v1/utils/barcode | 바코드 PNG 생성 | `ArrayBuffer` 반환 |
| [pdf2png](#pdf2png) | POST | /v1/utils/pdf2png | PDF 업로드 후 PNG 변환 | multipart/form-data |
| [pdf2pngByFileSeq](#pdf2pngbyfileseq) | POST | /v1/utils/pdf2png/:fileSeq | 저장된 파일 기준 PNG 변환 | JSON body 옵션 전달 |
| [pdf2jpg](#pdf2jpg) | POST | /v1/utils/pdf2jpg | PDF 업로드 후 JPG 변환 | multipart/form-data |
| [pdf2jpgByFileSeq](#pdf2jpgbyfileseq) | POST | /v1/utils/pdf2jpg/:fileSeq | 저장된 파일 기준 JPG 변환 | JSON body 옵션 전달 |

## 푸시 관련 엔티티 헬퍼

이 섹션은 전용 라우트를 직접 두기보다 엔티티 CRUD를 감싼 메서드입니다.

| 클라이언트 메서드 | HTTP | 경로 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| [push](#push) | POST | /v1/entity/:pushEntity/submit | 푸시 관련 엔티티 submit 래퍼 | 임의 엔티티명 전달 |
| [pushLogList](#pushloglist) | POST | /v1/entity/push_log/list | 푸시 로그 목록 조회 | `list()` 래퍼 |
| [registerPushDevice](#registerpushdevice) | POST | /v1/entity/account_device/submit | 디바이스 등록 | account_device 엔티티 submit |
| [updatePushDeviceToken](#updatepushdevicetoken) | POST | /v1/entity/account_device/submit | 디바이스 토큰 갱신 | account_device 엔티티 submit |
| [disablePushDevice](#disablepushdevice) | POST | /v1/entity/account_device/submit | 푸시 수신 비활성화 | account_device 엔티티 submit |

## 관리자 API

### 공통 헬퍼

| 클라이언트 메서드 | HTTP | 경로 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| [adminPath](#adminpath) | - | /v1/admin/* | 관리자 경로 조합 | 문자열 조합만 수행 |
| [adminGet](#adminget) | GET | /v1/admin:path | 관리자 GET 래퍼 | 범용 헬퍼 |
| [adminPost](#adminpost) | POST | /v1/admin:path | 관리자 POST 래퍼 | 범용 헬퍼 |
| [adminPut](#adminput) | PUT | /v1/admin:path | 관리자 PUT 래퍼 | 범용 헬퍼 |
| [adminPatch](#adminpatch) | PATCH | /v1/admin:path | 관리자 PATCH 래퍼 | 범용 헬퍼 |
| [adminDelete](#admindelete) | DELETE | /v1/admin:path | 관리자 DELETE 래퍼 | 범용 헬퍼 |

### 엔티티 / ERD / 설정

| 클라이언트 메서드 | HTTP | 경로 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| [listAdminEntities](#listadminentities) | GET | /v1/admin/entities | 엔티티 목록 조회 | - |
| [getAdminErdSchema](#getadminerdschema) | GET | /v1/admin/erd/schema | ERD 스키마 조회 | - |
| [batchEnsureAdminEntities](#batchensureadminentities) | POST | /v1/admin/entities/batch-ensure | 엔티티 일괄 보장 | - |
| [createAdminEntityConfig](#createadminentityconfig) | POST | /v1/admin/:entity/create | 엔티티 설정 생성 | - |
| [getAdminEntityConfig](#getadminentityconfig) | GET | /v1/admin/:entity/config | 엔티티 설정 조회 | - |
| [updateAdminEntityConfig](#updateadminentityconfig) | PUT | /v1/admin/:entity/config | 엔티티 설정 갱신 | - |
| [validateAdminEntityConfig](#validateadminentityconfig) | POST | /v1/admin/:entity/validate 또는 /v1/admin/entity/validate | 엔티티 설정 검증 | `entity` 인자 여부에 따라 경로 변경 |
| [normalizeAdminEntityConfig](#normalizeadminentityconfig) | POST | /v1/admin/:entity/normalize 또는 /v1/admin/entity/normalize | 엔티티 설정 정규화 | `entity` 인자 여부에 따라 경로 변경 |
| [getAdminEntityStats](#getadminentitystats) | POST | /v1/admin/:entity/stats | 엔티티 통계 조회 | - |
| [reindexAdminEntity](#reindexadminentity) | POST | /v1/admin/:entity/reindex | 인덱스 재생성 | - |
| [syncAdminEntitySchema](#syncadminentityschema) | POST | /v1/admin/:entity/sync-schema | 스키마 동기화 | - |
| [resetAdminEntity](#resetadminentity) | POST | /v1/admin/:entity/reset | 엔티티 초기화 | - |
| [truncateAdminEntity](#truncateadminentity) | POST | /v1/admin/:entity/truncate | 데이터 비우기 | - |
| [dropAdminEntity](#dropadminentity) | POST | /v1/admin/:entity/drop | 엔티티 삭제 | - |
| [resetAllAdmin](#resetalladmin) | POST | /v1/admin/reset-all | 전체 초기화 | - |
| [listAdminConfigs](#listadminconfigs) | GET | /v1/admin/configs | 설정 도메인 목록 조회 | - |
| [getAdminConfig](#getadminconfig) | GET | /v1/admin/configs/:domain | 설정 조회 | - |
| [updateAdminConfig](#updateadminconfig) | PATCH | /v1/admin/configs/:domain | 설정 패치 | - |

### 권한 / API Key / 계정 / 라이선스

| 클라이언트 메서드 | HTTP | 경로 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| [listAdminRoles](#listadminroles) | GET | /v1/admin/roles | 역할 목록 조회 | - |
| [createAdminRole](#createadminrole) | POST | /v1/admin/roles | 역할 생성 | - |
| [getAdminRole](#getadminrole) | GET | /v1/admin/roles/:seq | 역할 상세 조회 | - |
| [updateAdminRole](#updateadminrole) | PATCH | /v1/admin/roles/:seq | 역할 수정 | - |
| [deleteAdminRole](#deleteadminrole) | DELETE | /v1/admin/roles/:seq | 역할 삭제 | - |
| [listAdminApiKeys](#listadminapikeys) | GET | /v1/admin/api-keys | API Key 목록 조회 | - |
| [createAdminApiKey](#createadminapikey) | POST | /v1/admin/api-keys | API Key 생성 | - |
| [getAdminApiKey](#getadminapikey) | GET | /v1/admin/api-keys/:seq | API Key 조회 | - |
| [updateAdminApiKey](#updateadminapikey) | PATCH | /v1/admin/api-keys/:seq | API Key 수정 | - |
| [deleteAdminApiKey](#deleteadminapikey) | DELETE | /v1/admin/api-keys/:seq | API Key 삭제 | - |
| [regenerateAdminApiKeySecret](#regenerateadminapikeysecret) | POST | /v1/admin/api-keys/:seq/regenerate-secret | API Key secret 재발급 | - |
| [listAdminAccounts](#listadminaccounts) | GET | /v1/admin/accounts | 계정 목록 조회 | - |
| [createAdminAccount](#createadminaccount) | POST | /v1/admin/accounts | 계정 생성 | - |
| [getAdminAccount](#getadminaccount) | GET | /v1/admin/accounts/:seq | 계정 조회 | - |
| [updateAdminAccount](#updateadminaccount) | PATCH | /v1/admin/accounts/:seq | 계정 수정 | - |
| [deleteAdminAccount](#deleteadminaccount) | DELETE | /v1/admin/accounts/:seq | 계정 삭제 | - |
| [disableAdminAccountTwoFactor](#disableadminaccounttwofactor) | DELETE | /v1/admin/accounts/:seq/2fa | 계정 2FA 해제 | - |
| [listAdminLicenses](#listadminlicenses) | GET | /v1/admin/licenses | 라이선스 목록 조회 | - |
| [createAdminLicense](#createadminlicense) | POST | /v1/admin/licenses | 라이선스 생성 | - |
| [getAdminLicense](#getadminlicense) | GET | /v1/admin/licenses/:seq | 라이선스 조회 | - |
| [updateAdminLicense](#updateadminlicense) | PATCH | /v1/admin/licenses/:seq | 라이선스 수정 | - |
| [deleteAdminLicense](#deleteadminlicense) | DELETE | /v1/admin/licenses/:seq | 라이선스 삭제 | - |

### 백업

| 클라이언트 메서드 | HTTP | 경로 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| [runAdminBackup](#runadminbackup) | POST | /v1/admin/backup/run | 백업 실행 | - |
| [getAdminBackupStatus](#getadminbackupstatus) | POST | /v1/admin/backup/status | 백업 상태 조회 | - |
| [listAdminBackups](#listadminbackups) | POST | /v1/admin/backup/list | 백업 목록 조회 | - |
| [restoreAdminBackup](#restoreadminbackup) | POST | /v1/admin/backup/restore | 백업 복원 요청 | 서버 구현 상태는 별도 확인 필요 |
| [deleteAdminBackup](#deleteadminbackup) | POST | /v1/admin/backup/delete | 백업 삭제 | - |

## 상세 예제

### checkHealth

```ts
const health = await client.checkHealth();
```

### login

```ts
const result = await client.login("user@example.com", "password");
```

### tokenRefresh

```ts
const token = await client.tokenRefresh();
```

### refreshToken

```ts
const token = await client.refreshToken(refreshToken);
```

### logout

```ts
await client.logout();
```

### me

```ts
const me = await client.me();
```

### withdraw

```ts
await client.withdraw("current-password");
```

### transStart

```ts
const txId = await client.transStart();
```

### transCommit

```ts
await client.transCommit();
```

### transRollback

```ts
await client.transRollback();
```

### transactionStart

```ts
const tx = await client.transactionStart();
```

### storageUpload

```ts
const result = await client.storageUpload("product", input.files[0], {
  refSeq: 123,
  isPublic: true,
});
```

### storageDownload

```ts
const bytes = await client.storageDownload("product", uuid);
```

### storageDelete

```ts
await client.storageDelete("product", uuid);
```

### storageList

```ts
const files = await client.storageList("product", { refSeq: 123 });
```

### storageMeta

```ts
const meta = await client.storageMeta("product", uuid);
```

### storageToken

```ts
const token = await client.storageToken(uuid);
```

### storageViewUrl

```ts
const url = client.storageViewUrl(uuid);
```

### storageDownloadUrl

```ts
const downloadUrl = client.storageDownloadUrl(uuid);
```

### storageUrl

```ts
const inlineUrl = client.storageUrl(uuid);
```

### transactionCommit

```ts
await client.transactionCommit(txId);
```

### transactionRollback

```ts
await client.transactionRollback(txId);
```

### meta

```ts
const meta = await client.meta("account");
```

### validate

```ts
await client.validate("account", { email: "user@example.com" });
```

### get

```ts
const row = await client.get("account", 1);
```

### find

```ts
const row = await client.find("account", { email: "user@example.com" });
```

### list

```ts
const rows = await client.list("account", { page: 1, limit: 20 });
```

### count

```ts
const total = await client.count("account", { status: "active" });
```

### query

```ts
const rows = await client.query("account", {
  select: ["seq", "email"],
  where: "status = 'active'",
});
```

### submit

```ts
const saved = await client.submit("account", { email: "user@example.com" });
```

### delete

```ts
await client.delete("account", 1, { hard: true });
```

### history

```ts
const histories = await client.history("account", 1, { page: 1, limit: 10 });
```

### rollback

```ts
await client.rollback("account", historySeq);
```

### fileUpload

```ts
const uploaded = await client.fileUpload("account", file, {
  refSeq: 1,
  isPublic: false,
});
```

### fileDownload

```ts
const buffer = await client.fileDownload("account", uuid);
```

### fileDelete

```ts
await client.fileDelete("account", uuid);
```

### fileList

```ts
const files = await client.fileList("account", { refSeq: 1 });
```

### fileMeta

```ts
const meta = await client.fileMeta("account", uuid);
```

### fileToken

```ts
const token = await client.fileToken(uuid);
```

### fileViewUrl

```ts
const url = client.fileViewUrl(uuid, { download: true });
```

### fileUrl

```ts
const url = client.fileUrl(uuid);
```

### smtpSend

```ts
await client.smtpSend({
  to: "user@example.com",
  template: "welcome",
  vars: { name: "홍길동" },
});
```

### smtpStatus

```ts
const status = await client.smtpStatus(seq);
```

### smtpTemplatePreview

```ts
const html = await client.smtpTemplatePreview("auth/welcome");
```

### addressSido

```ts
const sido = await client.addressSido();
```

### addressSigungu

```ts
const sigungu = await client.addressSigungu({ sido: "서울특별시" });
```

### addressDong

```ts
const dong = await client.addressDong({
  sido: "서울특별시",
  sigungu: "강남구",
});
```

### addressClean

```ts
const cleaned = await client.addressClean({ q: "서울 강남구 테헤란로 1" });
```

### qrcode

```ts
const png = await client.qrcode("https://example.com");
```

### qrcodeBase64

```ts
const qr = await client.qrcodeBase64("https://example.com");
```

### qrcodeText

```ts
const qr = await client.qrcodeText("https://example.com");
```

### barcode

```ts
const png = await client.barcode("1234567890128", { type: "ean13" });
```

### pdf2png

```ts
const png = await client.pdf2png(pdfArrayBuffer, { dpi: 200 });
```

### pdf2pngByFileSeq

```ts
const png = await client.pdf2pngByFileSeq(fileSeq, { dpi: 200 });
```

### pdf2jpg

```ts
const jpg = await client.pdf2jpg(pdfArrayBuffer, { dpi: 200 });
```

### pdf2jpgByFileSeq

```ts
const jpg = await client.pdf2jpgByFileSeq(fileSeq, { dpi: 200 });
```

### push

```ts
await client.push("push_log", { title: "알림", body: "본문" });
```

### pushLogList

```ts
const logs = await client.pushLogList({ page: 1, limit: 20 });
```

### registerPushDevice

```ts
await client.registerPushDevice(1, "device-id", "push-token");
```

### updatePushDeviceToken

```ts
await client.updatePushDeviceToken(deviceSeq, "new-push-token");
```

### disablePushDevice

```ts
await client.disablePushDevice(deviceSeq);
```

### adminPath

```ts
const path = client.adminPath("/entities");
```

### adminGet

```ts
const entities = await client.adminGet("/entities");
```

### adminPost

```ts
const result = await client.adminPost("/reset-all", {});
```

### adminPut

```ts
const result = await client.adminPut("/account/config", { enabled: true });
```

### adminPatch

```ts
const result = await client.adminPatch("/configs/server", { timezone: "Asia/Seoul" });
```

### adminDelete

```ts
const result = await client.adminDelete("/roles/1");
```

### listAdminEntities

```ts
const entities = await client.listAdminEntities();
```

### getAdminErdSchema

```ts
const schema = await client.getAdminErdSchema();
```

### batchEnsureAdminEntities

```ts
await client.batchEnsureAdminEntities([configA, configB]);
```

### createAdminEntityConfig

```ts
await client.createAdminEntityConfig("account", entityConfig);
```

### getAdminEntityConfig

```ts
const config = await client.getAdminEntityConfig("account");
```

### updateAdminEntityConfig

```ts
await client.updateAdminEntityConfig("account", patch);
```

### validateAdminEntityConfig

```ts
await client.validateAdminEntityConfig(entityConfig, "account");
```

### normalizeAdminEntityConfig

```ts
await client.normalizeAdminEntityConfig(entityConfig, "account");
```

### getAdminEntityStats

```ts
const stats = await client.getAdminEntityStats("account", {});
```

### reindexAdminEntity

```ts
await client.reindexAdminEntity("account");
```

### syncAdminEntitySchema

```ts
await client.syncAdminEntitySchema("account");
```

### resetAdminEntity

```ts
await client.resetAdminEntity("account");
```

### truncateAdminEntity

```ts
await client.truncateAdminEntity("account");
```

### dropAdminEntity

```ts
await client.dropAdminEntity("account");
```

### resetAllAdmin

```ts
await client.resetAllAdmin({ includeSystem: false });
```

### listAdminConfigs

```ts
const configs = await client.listAdminConfigs();
```

### getAdminConfig

```ts
const config = await client.getAdminConfig("server");
```

### updateAdminConfig

```ts
await client.updateAdminConfig("server", { timezone: "Asia/Seoul" });
```

### listAdminRoles

```ts
const roles = await client.listAdminRoles();
```

### createAdminRole

```ts
await client.createAdminRole({ name: "manager" });
```

### getAdminRole

```ts
const role = await client.getAdminRole(1);
```

### updateAdminRole

```ts
await client.updateAdminRole(1, { name: "operator" });
```

### deleteAdminRole

```ts
await client.deleteAdminRole(1);
```

### listAdminApiKeys

```ts
const apiKeys = await client.listAdminApiKeys();
```

### createAdminApiKey

```ts
await client.createAdminApiKey({ name: "web" });
```

### getAdminApiKey

```ts
const apiKey = await client.getAdminApiKey(1);
```

### updateAdminApiKey

```ts
await client.updateAdminApiKey(1, { enabled: true });
```

### deleteAdminApiKey

```ts
await client.deleteAdminApiKey(1);
```

### regenerateAdminApiKeySecret

```ts
await client.regenerateAdminApiKeySecret(1);
```

### listAdminAccounts

```ts
const accounts = await client.listAdminAccounts();
```

### createAdminAccount

```ts
await client.createAdminAccount({ email: "user@example.com" });
```

### getAdminAccount

```ts
const account = await client.getAdminAccount(1);
```

### updateAdminAccount

```ts
await client.updateAdminAccount(1, { name: "홍길동" });
```

### deleteAdminAccount

```ts
await client.deleteAdminAccount(1);
```

### disableAdminAccountTwoFactor

```ts
await client.disableAdminAccountTwoFactor(1);
```

### listAdminLicenses

```ts
const licenses = await client.listAdminLicenses();
```

### createAdminLicense

```ts
await client.createAdminLicense({ name: "basic" });
```

### getAdminLicense

```ts
const license = await client.getAdminLicense(1);
```

### updateAdminLicense

```ts
await client.updateAdminLicense(1, { enabled: true });
```

### deleteAdminLicense

```ts
await client.deleteAdminLicense(1);
```

### runAdminBackup

```ts
await client.runAdminBackup({ full: true });
```

### getAdminBackupStatus

```ts
const status = await client.getAdminBackupStatus();
```

### listAdminBackups

```ts
const backups = await client.listAdminBackups();
```

### restoreAdminBackup

```ts
await client.restoreAdminBackup({ backup_name: "2026-04-09" });
```

### deleteAdminBackup

```ts
await client.deleteAdminBackup({ backup_name: "2026-04-09" });
```

## 메모

- EntityServerApi는 EntityServerClientBase 위에 mixin을 조합한 클래스입니다.
- EntityAppServerApi는 이 문서의 모든 메서드를 그대로 상속합니다.
