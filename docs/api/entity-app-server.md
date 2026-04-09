# EntityAppServerApi

현재 문서는 /home/ehfuse/npm/entity-client/src/EntityAppServerApi.ts 와 /home/ehfuse/npm/entity-client/src/mixins/app 기준으로 정리했습니다.

## 개요

- EntityAppServerApi는 EntityServerApi를 상속합니다.
- 따라서 [EntityServerApi](./entity-server.md)에 있는 모든 메서드를 그대로 사용할 수 있습니다.
- 이 문서에는 entity-app-server 전용으로 추가되는 라우트만 정리했습니다.

표의 메서드명을 누르면 문서 하단의 상세 예제로 이동합니다.

## 계정

| 클라이언트 메서드 | HTTP | 경로 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| [accountRegister](#accountregister) | POST | /v1/account/register | 회원가입 | 인증 없이 호출 |
| [accountWithdraw](#accountwithdraw) | POST | /v1/account/withdraw | 앱 계정 탈퇴 | - |
| [accountChangePassword](#accountchangepassword) | POST | /v1/account/change-password | 비밀번호 변경 | - |
| [accountReactivate](#accountreactivate) | POST | /v1/account/reactivate | 휴면/탈퇴 계정 재활성화 | 인증 없이 호출 |
| [listAccountBiometrics](#listaccountbiometrics) | GET | /v1/account/biometric | 등록된 생체인증 목록 조회 | - |
| [registerAccountBiometric](#registeraccountbiometric) | POST | /v1/account/biometric | 생체인증 등록 | - |
| [deleteAccountBiometric](#deleteaccountbiometric) | DELETE | /v1/account/biometric/:seq | 생체인증 삭제 | - |

## 이메일 인증

| 클라이언트 메서드 | HTTP | 경로 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| [sendEmailVerification](#sendemailverification) | POST | /v1/email-verify/send | 인증 메일 발송 | 인증 없이 호출 |
| [confirmEmailVerification](#confirmemailverification) | POST | /v1/email-verify/confirm | 인증 코드 확인 | 인증 없이 호출 |
| [activateEmailVerification](#activateemailverification) | GET | /v1/email-verify/activate | 인증 링크 활성화 | 쿼리스트링 사용 |
| [getEmailVerificationStatus](#getemailverificationstatus) | GET | /v1/email-verify/status | 인증 상태 조회 | - |
| [changeVerifiedEmail](#changeverifiedemail) | POST | /v1/email-verify/change | 인증 이메일 변경 | - |

## 비밀번호 재설정

| 클라이언트 메서드 | HTTP | 경로 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| [requestPasswordReset](#requestpasswordreset) | POST | /v1/password-reset/request | 재설정 메일 요청 | 인증 없이 호출 |
| [validatePasswordResetToken](#validatepasswordresettoken) | GET | /v1/password-reset/validate/:token | 토큰 유효성 검사 | 인증 없이 호출 |
| [verifyPasswordReset](#verifypasswordreset) | POST | /v1/password-reset/verify | 새 비밀번호 확정 | 인증 없이 호출 |

## OAuth

| 클라이언트 메서드 | HTTP | 경로 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| [oauthAuthorizeUrl](#oauthauthorizeurl) | - | /v1/oauth/:provider | OAuth 인가 URL 생성 | 문자열 조합만 수행 |
| [oauthCallback](#oauthcallback) | GET 또는 POST | /v1/oauth/:provider/callback | OAuth 콜백 처리 | `method` 인자로 GET/POST 선택 |
| [linkOAuthAccount](#linkoauthaccount) | POST | /v1/account/oauth/link | OAuth 계정 연결 | - |
| [unlinkOAuthAccount](#unlinkoauthaccount) | DELETE | /v1/account/oauth/link/:provider | OAuth 계정 연결 해제 | - |
| [listOAuthProviders](#listoauthproviders) | GET | /v1/account/oauth/providers | 연결 가능한 OAuth 제공자 목록 | - |
| [refreshOAuthProviderToken](#refreshoauthprovidertoken) | POST | /v1/account/oauth/refresh/:provider | 제공자 토큰 갱신 | - |

## 2단계 인증

| 클라이언트 메서드 | HTTP | 경로 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| [setupTwoFactor](#setuptwofactor) | POST | /v1/account/2fa/setup | 2FA 설정 시작 | - |
| [verifyTwoFactorSetup](#verifytwofactorsetup) | POST | /v1/account/2fa/setup/verify | 2FA 설정 검증 | 인증 없이 호출 |
| [disableTwoFactor](#disabletwofactor) | DELETE | /v1/account/2fa | 2FA 비활성화 | - |
| [getTwoFactorStatus](#gettwofactorstatus) | GET | /v1/account/2fa/status | 2FA 상태 조회 | - |
| [regenerateTwoFactorRecoveryCodes](#regeneratetwofactorrecoverycodes) | POST | /v1/account/2fa/recovery/regenerate | 복구 코드 재발급 | - |
| [verifyTwoFactor](#verifytwofactor) | POST | /v1/account/2fa/verify | 2FA 코드 검증 | 인증 없이 호출 |
| [recoverTwoFactorAccess](#recovertwofactoraccess) | POST | /v1/account/2fa/recovery | 복구 코드로 접근 복구 | 인증 없이 호출 |

## 게시판

### 카테고리 / 게시글 / 댓글

| 클라이언트 메서드 | HTTP | 경로 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| [listBoardCategories](#listboardcategories) | GET | /v1/board/categories | 카테고리 목록 조회 | 쿼리 지원 |
| [getBoardCategory](#getboardcategory) | GET | /v1/board/categories/:seq | 카테고리 조회 | 인증 없이 호출 |
| [createBoardCategory](#createboardcategory) | POST | /v1/board/categories | 카테고리 생성 | - |
| [updateBoardCategory](#updateboardcategory) | PUT | /v1/board/categories/:seq | 카테고리 수정 | - |
| [deleteBoardCategory](#deleteboardcategory) | DELETE | /v1/board/categories/:seq | 카테고리 삭제 | - |
| [listBoardPosts](#listboardposts) | GET | /v1/board/:category/list | 게시글 목록 조회 | 쿼리 지원 |
| [getBoardPost](#getboardpost) | GET | /v1/board/posts/:seq | 게시글 조회 | - |
| [createBoardPost](#createboardpost) | POST | /v1/board/:category/submit | 게시글 생성 | - |
| [updateBoardPost](#updateboardpost) | PUT | /v1/board/posts/:seq | 게시글 수정 | - |
| [deleteBoardPost](#deleteboardpost) | DELETE | /v1/board/posts/:seq | 게시글 삭제 | - |
| [listBoardComments](#listboardcomments) | GET | /v1/board/posts/:postSeq/comments | 댓글 목록 조회 | 인증 없이 호출 가능, 쿼리 지원 |
| [createBoardComment](#createboardcomment) | POST | /v1/board/posts/:postSeq/comments/submit | 댓글 생성 | - |
| [updateBoardComment](#updateboardcomment) | PUT | /v1/board/comments/:seq | 댓글 수정 | - |
| [deleteBoardComment](#deleteboardcomment) | DELETE | /v1/board/comments/:seq | 댓글 삭제 | - |

### 게시판 파일 / 게스트 / 반응

| 클라이언트 메서드 | HTTP | 경로 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| [listBoardFiles](#listboardfiles) | GET | /v1/board/posts/:postSeq/files | 게시글 첨부 파일 목록 | 인증 없이 호출 |
| [uploadBoardFile](#uploadboardfile) | POST | /v1/board/posts/:postSeq/files | 게시글 첨부 파일 업로드 | multipart/form-data |
| [boardFileUrl](#boardfileurl) | - | /v1/board/files/:uuid | 게시판 파일 URL 생성 | 문자열 조합만 수행 |
| [deleteBoardFile](#deleteboardfile) | DELETE | /v1/board/files/:uuid | 게시판 파일 삭제 | - |
| [createBoardGuestPost](#createboardguestpost) | POST | /v1/board/:category/guest-submit | 비회원 게시글 작성 | 인증 없이 호출 |
| [authenticateBoardGuestPost](#authenticateboardguestpost) | POST | /v1/board/posts/:seq/guest-auth | 비회원 글 인증 | 인증 없이 호출 |
| [toggleBoardPostLike](#toggleboardpostlike) | POST | /v1/board/posts/:seq/like | 게시글 좋아요 토글 | - |
| [acceptBoardPost](#acceptboardpost) | POST | /v1/board/posts/:seq/accept | 게시글 채택 | - |
| [rateBoardPost](#rateboardpost) | POST | /v1/board/posts/:seq/rating | 게시글 평점 | - |
| [rateBoardComment](#rateboardcomment) | POST | /v1/board/comments/:seq/rating | 댓글 평점 | - |

### 태그 / 신고 / 멘션 / 읽음 처리

| 클라이언트 메서드 | HTTP | 경로 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| [listBoardTags](#listboardtags) | GET | /v1/board/tags | 태그 목록 조회 | 쿼리 지원 |
| [setBoardPostTags](#setboardposttags) | PUT | /v1/board/posts/:seq/tags | 게시글 태그 설정 | - |
| [reportBoardPost](#reportboardpost) | POST | /v1/board/posts/:seq/report | 게시글 신고 | - |
| [reportBoardComment](#reportboardcomment) | POST | /v1/board/comments/:seq/report | 댓글 신고 | - |
| [listBoardReports](#listboardreports) | GET | /v1/board/admin/reports | 신고 목록 조회 | 관리자 영역 |
| [updateBoardReport](#updateboardreport) | PATCH | /v1/board/admin/reports/:seq | 신고 처리 상태 수정 | 관리자 영역 |
| [markBoardPostRead](#markboardpostread) | POST | /v1/board/posts/:seq/read | 게시글 읽음 처리 | - |
| [listBoardMentions](#listboardmentions) | GET | /v1/board/mentions | 멘션 목록 조회 | - |
| [markBoardMentionRead](#markboardmentionread) | PATCH | /v1/board/mentions/:seq/read | 멘션 읽음 처리 | - |

## 플러그인

### 공휴일 / 본인인증 / OCR

| 클라이언트 메서드 | HTTP | 경로 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| [listHolidays](#listholidays) | GET | /v1/holidays | 공휴일 목록 조회 | 인증 없이 호출 |
| [getHolidayByDate](#getholidaybydate) | GET | /v1/holidays/:locdate | 특정 날짜 공휴일 조회 | 인증 없이 호출 |
| [syncHolidays](#syncholidays) | POST | /v1/holidays/sync | 공휴일 동기화 | 관리자 성격 |
| [identityRequest](#identityrequest) | POST | /v1/identity/request | 본인인증 요청 생성 | 인증 없이 호출 |
| [identityCallback](#identitycallback) | POST | /v1/identity/callback | 본인인증 콜백 수신 | 인증 없이 호출 |
| [identityResult](#identityresult) | GET | /v1/identity/result/:requestId | 본인인증 결과 조회 | 인증 없이 호출 |
| [identityVerifyCI](#identityverifyci) | POST | /v1/identity/verify-ci | CI 중복 확인 | 인증 필요 |
| [ocrRecognize](#ocrrecognize) | POST | /v1/ocr/recognize | OCR 인식 | multipart/form-data |
| [ocrRecognizeAsync](#ocrrecognizeasync) | POST | /v1/ocr/recognize/async | OCR 비동기 인식 | multipart/form-data |
| [ocrRecognizeByDocType](#ocrrecognizebydoctype) | POST | /v1/ocr/:docType | 문서 유형별 OCR 인식 | multipart/form-data |
| [listOcrResults](#listocrresults) | GET | /v1/ocr/results | OCR 결과 목록 | - |
| [getOcrResult](#getocrresult) | GET | /v1/ocr/results/:id | OCR 결과 상세 | - |
| [getOcrResultText](#getocrresulttext) | GET | /v1/ocr/results/:id/text | OCR 추출 텍스트 | - |
| [deleteOcrResult](#deleteocrresult) | DELETE | /v1/ocr/results/:id | OCR 결과 삭제 | - |
| [getOcrQuota](#getocrquota) | GET | /v1/ocr/quota | OCR 사용량 조회 | - |

### 메시징 / 푸시

| 클라이언트 메서드 | HTTP | 경로 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| [smsSend](#smssend) | POST | /v1/sms/send | SMS/LMS/MMS 발송 | - |
| [smsStatus](#smsstatus) | GET | /v1/sms/status/:seq | SMS 발송 상태 조회 | 인증 없이 호출 |
| [smsVerificationSend](#smsverificationsend) | POST | /v1/sms/verification/send | SMS 인증번호 발송 | 인증 없이 호출 |
| [smsVerificationVerify](#smsverificationverify) | POST | /v1/sms/verification/verify | SMS 인증번호 검증 | 인증 없이 호출 |
| [alimtalkSend](#alimtalksend) | POST | /v1/alimtalk/send | 알림톡 발송 | - |
| [alimtalkStatus](#alimtalkstatus) | GET | /v1/alimtalk/status/:seq | 알림톡 상태 조회 | 인증 없이 호출 |
| [listAlimtalkTemplates](#listalimtalktemplates) | GET | /v1/alimtalk/templates | 알림톡 템플릿 목록 | 인증 없이 호출 |
| [alimtalkWebhook](#alimtalkwebhook) | POST | /v1/alimtalk/webhook/:provider | 알림톡 웹훅 수신 | 인증 없이 호출 |
| [friendtalkSend](#friendtalksend) | POST | /v1/friendtalk/send | 친구톡 발송 | - |
| [appPushSend](#apppushsend) | POST | /v1/push/send | 단일 계정 푸시 발송 | - |
| [appPushBroadcast](#apppushbroadcast) | POST | /v1/push/broadcast | 다중 계정 브로드캐스트 | - |
| [appPushStatus](#apppushstatus) | GET | /v1/push/status/:seq | 푸시 상태 조회 | - |
| [appPushRegisterDevice](#apppushregisterdevice) | POST | /v1/push/device | 디바이스 등록/갱신 | - |
| [appPushUnregisterDevice](#apppushunregisterdevice) | DELETE | /v1/push/device/:seq | 디바이스 비활성화 | - |

### 결제 / 세금계산서

| 클라이언트 메서드 | HTTP | 경로 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| [pgCreateOrder](#pgcreateorder) | POST | /v1/pg/orders | 주문 생성 | - |
| [pgGetOrder](#pggetorder) | GET | /v1/pg/orders/:orderId | 주문 조회 | - |
| [pgConfirmPayment](#pgconfirmpayment) | POST | /v1/pg/confirm | 결제 승인 | - |
| [pgCancelPayment](#pgcancelpayment) | POST | /v1/pg/orders/:orderId/cancel | 결제 취소 | - |
| [pgSyncPaymentStatus](#pgsyncpaymentstatus) | POST | /v1/pg/orders/:orderId/sync | 결제 상태 동기화 | 관리자 성격 |
| [pgWebhook](#pgwebhook) | POST | /v1/pg/webhook | PG 웹훅 수신 | 인증 없이 호출 |
| [pgGetClientConfig](#pggetclientconfig) | GET | /v1/pg/config | 클라이언트 결제 설정 조회 | 인증 없이 호출 |
| [taxinvoiceRegistIssue](#taxinvoiceregistissue) | POST | /v1/taxinvoice | 즉시 등록·발행 | - |
| [taxinvoiceRegister](#taxinvoiceregister) | POST | /v1/taxinvoice/register | 임시 등록 | - |
| [taxinvoiceIssue](#taxinvoiceissue) | POST | /v1/taxinvoice/:seq/issue | 임시 등록건 발행 | - |
| [taxinvoiceCancelIssue](#taxinvoicecancelissue) | POST | /v1/taxinvoice/:seq/cancel | 발행 취소 | - |
| [taxinvoiceGetState](#taxinvoicegetstate) | GET | /v1/taxinvoice/:seq/state | 전송 상태 조회 | - |
| [taxinvoiceGetDetail](#taxinvoicegetdetail) | GET | /v1/taxinvoice/:seq | 상세 조회 | - |

## LLM 플러그인

### 기본 채팅 / 대화 세션

| 클라이언트 메서드 | HTTP | 경로 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| [llmChat](#llmchat) | POST | /v1/llm/chat | 일반 채팅 응답 | - |
| [llmChatStream](#llmchatstream) | POST | /v1/llm/chat/stream | 스트리밍 채팅 응답 | - |
| [createLlmConversation](#createllmconversation) | POST | /v1/llm/conversations | 대화 세션 생성 | - |
| [sendLlmMessage](#sendllmmessage) | POST | /v1/llm/conversations/:seq/messages | 대화 세션에 메시지 전송 | - |
| [listLlmConversations](#listllmconversations) | GET | /v1/llm/conversations | 대화 세션 목록 조회 | 쿼리 지원 |
| [getLlmConversation](#getllmconversation) | GET | /v1/llm/conversations/:seq | 대화 세션 상세 | - |
| [updateLlmConversation](#updatellmconversation) | PATCH | /v1/llm/conversations/:seq | 대화 세션 수정 | - |
| [deleteLlmConversation](#deletellmconversation) | DELETE | /v1/llm/conversations/:seq | 대화 세션 삭제 | - |

### RAG

| 클라이언트 메서드 | HTTP | 경로 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| [ragUploadDocument](#raguploaddocument) | POST | /v1/llm/rag/documents | RAG 문서 업로드 | multipart/form-data |
| [ragListDocuments](#raglistdocuments) | GET | /v1/llm/rag/documents | RAG 문서 목록 | 쿼리 지원 |
| [ragDeleteDocument](#ragdeletedocument) | DELETE | /v1/llm/rag/documents/:id | RAG 문서 삭제 | - |
| [ragSearch](#ragsearch) | POST | /v1/llm/rag/search | RAG 검색 | - |
| [ragChat](#ragchat) | POST | /v1/llm/rag/chat | RAG 채팅 | - |
| [ragChatStream](#ragchatstream) | POST | /v1/llm/rag/chat/stream | RAG 스트리밍 채팅 | - |
| [ragRebuildIndex](#ragrebuildindex) | POST | /v1/llm/rag/rebuild-index | 인덱스 재구축 | - |

### 프로바이더 / 사용량 / 캐시 / 템플릿

| 클라이언트 메서드 | HTTP | 경로 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| [listLlmProviders](#listllmproviders) | GET | /v1/llm/providers | 프로바이더 목록 조회 | - |
| [getLlmUsage](#getllmusage) | GET | /v1/llm/usage | 사용량 조회 | 쿼리 지원 |
| [getLlmUsageSummary](#getllmusagesummary) | GET | /v1/llm/usage/summary | 사용량 요약 | 쿼리 지원 |
| [getLlmCacheStats](#getllmcachestats) | GET | /v1/llm/cache/stats | 캐시 통계 | - |
| [clearLlmCache](#clearllmcache) | DELETE | /v1/llm/cache | 캐시 초기화 | - |
| [listLlmTemplates](#listllmtemplates) | GET | /v1/llm/templates | 프롬프트 템플릿 목록 | - |
| [llmTemplateChat](#llmtemplatechat) | POST | /v1/llm/:name/chat | 템플릿 기반 채팅 | - |
| [llmTemplateChatStream](#llmtemplatechatstream) | POST | /v1/llm/:name/chat/stream | 템플릿 기반 스트리밍 채팅 | - |

### 챗봇 / 세션 / 프로필 메모리

| 클라이언트 메서드 | HTTP | 경로 | 설명 | 비고 |
| --- | --- | --- | --- | --- |
| [listLlmChatbots](#listllmchatbots) | GET | /v1/llm/chatbots | 챗봇 목록 조회 | 쿼리 지원 |
| [createLlmChatbot](#createllmchatbot) | POST | /v1/llm/chatbots | 챗봇 생성 | - |
| [getLlmChatbot](#getllmchatbot) | GET | /v1/llm/chatbots/:seq | 챗봇 상세 | - |
| [updateLlmChatbot](#updatellmchatbot) | PATCH | /v1/llm/chatbots/:seq | 챗봇 수정 | - |
| [deleteLlmChatbot](#deletellmchatbot) | DELETE | /v1/llm/chatbots/:seq | 챗봇 삭제 | - |
| [llmChatbotChat](#llmchatbotchat) | POST | /v1/llm/chatbots/:seq/chat | 챗봇 채팅 | - |
| [llmChatbotChatStream](#llmchatbotchatstream) | POST | /v1/llm/chatbots/:seq/chat/stream | 챗봇 스트리밍 채팅 | - |
| [listLlmChatbotSessions](#listllmchatbotsessions) | GET | /v1/llm/chatbots/:seq/sessions | 챗봇 세션 목록 | 쿼리 지원 |
| [deleteLlmChatbotSession](#deletellmchatbotsession) | DELETE | /v1/llm/chatbots/:seq/sessions/:sessionSeq | 챗봇 세션 삭제 | - |
| [listLlmProfiles](#listllmprofiles) | GET | /v1/llm/profiles | 프로필 메모리 목록 | 쿼리 지원 |
| [upsertLlmProfile](#upsertllmprofile) | POST | /v1/llm/profiles | 프로필 메모리 upsert | - |
| [deleteLlmProfile](#deletellmprofile) | DELETE | /v1/llm/profiles/:seq | 프로필 메모리 삭제 | - |

## 상세 예제

### accountRegister

```ts
await client.accountRegister({ email: "user@example.com", password: "secret" });
```

### accountWithdraw

```ts
await client.accountWithdraw({ reason: "서비스 미사용" });
```

### accountChangePassword

```ts
await client.accountChangePassword({
  current_password: "old-password",
  new_password: "new-password",
});
```

### accountReactivate

```ts
await client.accountReactivate({ email: "user@example.com", password: "secret" });
```

### listAccountBiometrics

```ts
const rows = await client.listAccountBiometrics();
```

### registerAccountBiometric

```ts
await client.registerAccountBiometric({ device_name: "iPhone" });
```

### deleteAccountBiometric

```ts
await client.deleteAccountBiometric(seq);
```

### sendEmailVerification

```ts
await client.sendEmailVerification({ email: "user@example.com" });
```

### confirmEmailVerification

```ts
await client.confirmEmailVerification({ email: "user@example.com", code: "123456" });
```

### activateEmailVerification

```ts
await client.activateEmailVerification({ token: "verify-token" });
```

### getEmailVerificationStatus

```ts
const status = await client.getEmailVerificationStatus();
```

### changeVerifiedEmail

```ts
await client.changeVerifiedEmail({ email: "new@example.com" });
```

### requestPasswordReset

```ts
await client.requestPasswordReset({ email: "user@example.com" });
```

### validatePasswordResetToken

```ts
const token = await client.validatePasswordResetToken(resetToken);
```

### verifyPasswordReset

```ts
await client.verifyPasswordReset({ token: resetToken, password: "new-password" });
```

### oauthAuthorizeUrl

```ts
const url = client.oauthAuthorizeUrl("kakao", { redirect_uri: callbackUrl });
```

### oauthCallback

```ts
const result = await client.oauthCallback("kakao", { code }, "POST");
```

### linkOAuthAccount

```ts
await client.linkOAuthAccount({ provider: "google", code });
```

### unlinkOAuthAccount

```ts
await client.unlinkOAuthAccount("google");
```

### listOAuthProviders

```ts
const providers = await client.listOAuthProviders();
```

### refreshOAuthProviderToken

```ts
await client.refreshOAuthProviderToken("google");
```

### setupTwoFactor

```ts
const setup = await client.setupTwoFactor();
```

### verifyTwoFactorSetup

```ts
await client.verifyTwoFactorSetup({ code: "123456" });
```

### disableTwoFactor

```ts
await client.disableTwoFactor();
```

### getTwoFactorStatus

```ts
const status = await client.getTwoFactorStatus();
```

### regenerateTwoFactorRecoveryCodes

```ts
const codes = await client.regenerateTwoFactorRecoveryCodes();
```

### verifyTwoFactor

```ts
await client.verifyTwoFactor({ code: "123456" });
```

### recoverTwoFactorAccess

```ts
await client.recoverTwoFactorAccess({ recovery_code: "AAAA-BBBB" });
```

### listBoardCategories

```ts
const categories = await client.listBoardCategories({ enabled: true });
```

### getBoardCategory

```ts
const category = await client.getBoardCategory(seq);
```

### createBoardCategory

```ts
await client.createBoardCategory({ name: "공지사항" });
```

### updateBoardCategory

```ts
await client.updateBoardCategory(seq, { name: "업데이트 공지" });
```

### deleteBoardCategory

```ts
await client.deleteBoardCategory(seq);
```

### listBoardPosts

```ts
const posts = await client.listBoardPosts("notice", { page: 1, limit: 20 });
```

### getBoardPost

```ts
const post = await client.getBoardPost(seq);
```

### createBoardPost

```ts
await client.createBoardPost("notice", { title: "제목", content: "내용" });
```

### updateBoardPost

```ts
await client.updateBoardPost(seq, { title: "수정 제목" });
```

### deleteBoardPost

```ts
await client.deleteBoardPost(seq);
```

### listBoardComments

```ts
const comments = await client.listBoardComments(postSeq, { page: 1 });
```

### createBoardComment

```ts
await client.createBoardComment(postSeq, { content: "댓글" });
```

### updateBoardComment

```ts
await client.updateBoardComment(seq, { content: "수정 댓글" });
```

### deleteBoardComment

```ts
await client.deleteBoardComment(seq);
```

### listBoardFiles

```ts
const files = await client.listBoardFiles(postSeq);
```

### uploadBoardFile

```ts
await client.uploadBoardFile(postSeq, file);
```

### boardFileUrl

```ts
const url = client.boardFileUrl(uuid);
```

### deleteBoardFile

```ts
await client.deleteBoardFile(uuid);
```

### createBoardGuestPost

```ts
await client.createBoardGuestPost("notice", { title: "비회원 글", content: "내용" });
```

### authenticateBoardGuestPost

```ts
await client.authenticateBoardGuestPost(seq, { password: "guest-password" });
```

### toggleBoardPostLike

```ts
await client.toggleBoardPostLike(seq);
```

### acceptBoardPost

```ts
await client.acceptBoardPost(seq);
```

### rateBoardPost

```ts
await client.rateBoardPost(seq, { score: 5 });
```

### rateBoardComment

```ts
await client.rateBoardComment(seq, { score: 5 });
```

### listBoardTags

```ts
const tags = await client.listBoardTags({ keyword: "배송" });
```

### setBoardPostTags

```ts
await client.setBoardPostTags(seq, { tag_seqs: [1, 2, 3] });
```

### reportBoardPost

```ts
await client.reportBoardPost(seq, { reason: "spam" });
```

### reportBoardComment

```ts
await client.reportBoardComment(seq, { reason: "abuse" });
```

### listBoardReports

```ts
const reports = await client.listBoardReports({ page: 1 });
```

### updateBoardReport

```ts
await client.updateBoardReport(seq, { status: "resolved" });
```

### markBoardPostRead

```ts
await client.markBoardPostRead(seq);
```

### listBoardMentions

```ts
const mentions = await client.listBoardMentions({ unread_only: true });
```

### markBoardMentionRead

```ts
await client.markBoardMentionRead(seq);
```

### listHolidays

```ts
const holidays = await client.listHolidays({ year: 2026, month: 4 });
```

### getHolidayByDate

```ts
const holiday = await client.getHolidayByDate("20260409");
```

### syncHolidays

```ts
await client.syncHolidays({ years: [2026] });
```

### identityRequest

```ts
const request = await client.identityRequest({ name: "홍길동", phone: "01012345678" });
```

### identityCallback

```ts
await client.identityCallback({ request_id: "req-1", status: "ok" });
```

### identityResult

```ts
const result = await client.identityResult(requestId);
```

### identityVerifyCI

```ts
const duplicated = await client.identityVerifyCI({ ci: "encrypted-ci" });
```

### ocrRecognize

```ts
await client.ocrRecognize(formData);
```

### ocrRecognizeAsync

```ts
await client.ocrRecognizeAsync(formData);
```

### ocrRecognizeByDocType

```ts
await client.ocrRecognizeByDocType("biz-license", formData);
```

### listOcrResults

```ts
const results = await client.listOcrResults({ page: 1 });
```

### getOcrResult

```ts
const result = await client.getOcrResult(id);
```

### getOcrResultText

```ts
const text = await client.getOcrResultText(id);
```

### deleteOcrResult

```ts
await client.deleteOcrResult(id);
```

### getOcrQuota

```ts
const quota = await client.getOcrQuota();
```

### smsSend

```ts
await client.smsSend({ to: "01012345678", text: "인증번호 123456" });
```

### smsStatus

```ts
const status = await client.smsStatus(seq);
```

### smsVerificationSend

```ts
await client.smsVerificationSend({ phone: "01012345678" });
```

### smsVerificationVerify

```ts
await client.smsVerificationVerify({ phone: "01012345678", code: "123456" });
```

### alimtalkSend

```ts
await client.alimtalkSend({ to: "01012345678", template_code: "WELCOME" });
```

### alimtalkStatus

```ts
const status = await client.alimtalkStatus(seq);
```

### listAlimtalkTemplates

```ts
const templates = await client.listAlimtalkTemplates();
```

### alimtalkWebhook

```ts
await client.alimtalkWebhook("bizmsg", payload);
```

### friendtalkSend

```ts
await client.friendtalkSend({ to: "01012345678", template_code: "NOTICE" });
```

### appPushSend

```ts
await client.appPushSend({ account_seq: 1, title: "알림", body: "본문" });
```

### appPushBroadcast

```ts
await client.appPushBroadcast({ account_seqs: [1, 2], title: "공지" });
```

### appPushStatus

```ts
const status = await client.appPushStatus(seq);
```

### appPushRegisterDevice

```ts
await client.appPushRegisterDevice({ platform: "ios", token: "push-token" });
```

### appPushUnregisterDevice

```ts
await client.appPushUnregisterDevice(seq);
```

### pgCreateOrder

```ts
const order = await client.pgCreateOrder({ order_id: "O-1001", amount: 10000 });
```

### pgGetOrder

```ts
const order = await client.pgGetOrder("O-1001");
```

### pgConfirmPayment

```ts
await client.pgConfirmPayment({ payment_key: "pay-key", order_id: "O-1001" });
```

### pgCancelPayment

```ts
await client.pgCancelPayment("O-1001", { reason: "고객 요청" });
```

### pgSyncPaymentStatus

```ts
await client.pgSyncPaymentStatus("O-1001");
```

### pgWebhook

```ts
await client.pgWebhook(payload);
```

### pgGetClientConfig

```ts
const config = await client.pgGetClientConfig();
```

### taxinvoiceRegistIssue

```ts
await client.taxinvoiceRegistIssue({ 공급자등록번호: "1234567890" });
```

### taxinvoiceRegister

```ts
await client.taxinvoiceRegister({ 공급자등록번호: "1234567890" });
```

### taxinvoiceIssue

```ts
await client.taxinvoiceIssue(seq);
```

### taxinvoiceCancelIssue

```ts
await client.taxinvoiceCancelIssue(seq, { memo: "발행 취소" });
```

### taxinvoiceGetState

```ts
const state = await client.taxinvoiceGetState(seq);
```

### taxinvoiceGetDetail

```ts
const invoice = await client.taxinvoiceGetDetail(seq);
```

### llmChat

```ts
const reply = await client.llmChat({ messages: [{ role: "user", content: "안녕" }] });
```

### llmChatStream

```ts
const stream = await client.llmChatStream({ messages: [{ role: "user", content: "안녕" }] });
```

### createLlmConversation

```ts
const conversation = await client.createLlmConversation({ title: "새 대화" });
```

### sendLlmMessage

```ts
await client.sendLlmMessage(seq, { content: "질문" });
```

### listLlmConversations

```ts
const conversations = await client.listLlmConversations({ page: 1 });
```

### getLlmConversation

```ts
const conversation = await client.getLlmConversation(seq);
```

### updateLlmConversation

```ts
await client.updateLlmConversation(seq, { title: "수정 제목" });
```

### deleteLlmConversation

```ts
await client.deleteLlmConversation(seq);
```

### ragUploadDocument

```ts
await client.ragUploadDocument(formData);
```

### ragListDocuments

```ts
const docs = await client.ragListDocuments({ page: 1 });
```

### ragDeleteDocument

```ts
await client.ragDeleteDocument(documentId);
```

### ragSearch

```ts
const result = await client.ragSearch({ query: "entity-client 문서" });
```

### ragChat

```ts
const reply = await client.ragChat({ query: "문서 요약" });
```

### ragChatStream

```ts
const stream = await client.ragChatStream({ query: "문서 요약" });
```

### ragRebuildIndex

```ts
await client.ragRebuildIndex();
```

### listLlmProviders

```ts
const providers = await client.listLlmProviders();
```

### getLlmUsage

```ts
const usage = await client.getLlmUsage({ from: "2026-04-01", to: "2026-04-09" });
```

### getLlmUsageSummary

```ts
const summary = await client.getLlmUsageSummary({ month: "2026-04" });
```

### getLlmCacheStats

```ts
const stats = await client.getLlmCacheStats();
```

### clearLlmCache

```ts
await client.clearLlmCache();
```

### listLlmTemplates

```ts
const templates = await client.listLlmTemplates();
```

### llmTemplateChat

```ts
const reply = await client.llmTemplateChat("summary", { input: "긴 텍스트" });
```

### llmTemplateChatStream

```ts
const stream = await client.llmTemplateChatStream("summary", { input: "긴 텍스트" });
```

### listLlmChatbots

```ts
const chatbots = await client.listLlmChatbots({ page: 1 });
```

### createLlmChatbot

```ts
const chatbot = await client.createLlmChatbot({ name: "고객센터 봇" });
```

### getLlmChatbot

```ts
const chatbot = await client.getLlmChatbot(seq);
```

### updateLlmChatbot

```ts
await client.updateLlmChatbot(seq, { enabled: true });
```

### deleteLlmChatbot

```ts
await client.deleteLlmChatbot(seq);
```

### llmChatbotChat

```ts
const reply = await client.llmChatbotChat(seq, { message: "배송 조회" });
```

### llmChatbotChatStream

```ts
const stream = await client.llmChatbotChatStream(seq, { message: "배송 조회" });
```

### listLlmChatbotSessions

```ts
const sessions = await client.listLlmChatbotSessions(seq, { page: 1 });
```

### deleteLlmChatbotSession

```ts
await client.deleteLlmChatbotSession(botSeq, sessionSeq);
```

### listLlmProfiles

```ts
const profiles = await client.listLlmProfiles({ page: 1 });
```

### upsertLlmProfile

```ts
await client.upsertLlmProfile({ key: "tone", value: "formal" });
```

### deleteLlmProfile

```ts
await client.deleteLlmProfile(seq);
```

## 메모

- EntityAppServerApi는 EntityServerApi를 상속하므로 서버 코어 라우트는 entity-server 문서를 함께 봐야 합니다.
- URL 문자열만 만드는 메서드는 `HTTP`를 `-`로 표기했습니다.
