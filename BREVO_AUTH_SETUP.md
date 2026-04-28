# Настройка Brevo SMTP для авторизации в LMERC

## Что сделано в коде

Код уже готов к OTP-only авторизации через любой SMTP-провайдер. В `src/hooks/useAuth.ts` и `src/features/auth/AuthModal.tsx` реализован чистый флоу:

1. Пользователь вводит email → `supabase.auth.signInWithOtp()` отправляет 6-значный код
2. Пользователь вводит код → `supabase.auth.verifyOtp()` создаёт сессию
3. Ни magic-link, ни паролей — только код из письма

## Шаги по настройке Brevo

### 1. Регистрация в Brevo

- Открой https://www.brevo.com/
- Зарегистрируй аккаунт (бесплатный план: 300 писем/день)

### 2. Подтверждение отправителя (Sender)

- **Campaigns → Senders & IP → Senders → Add a sender**
- Введи email (например, `noreply@твой-домен.com` или `lmerc@brevo.com` для теста)
- Подтверди через письмо
- **Для production:** добавь свой домен с DKIM/SPF-записями — это сильно улучшит доставляемость

### 3. Получение SMTP-ключа

- **Account → SMTP & API → SMTP**
- Скопируй **SMTP key** (нажми «Generate a new SMTP key» если нужно)
- Запиши:
  - Host: `smtp-relay.brevo.com`
  - Port: `587`
  - Login: твой подтверждённый email
  - Password: SMTP key

### 4. Настройка в Supabase Dashboard

1. Открой Supabase → твой проект → **Authentication → Settings**
2. В разделе **SMTP Settings**:
   - Enable Custom SMTP: **ON**
   - Sender email: твой подтверждённый Brevo-адрес
   - Sender name: `LMERC`
   - Host: `smtp-relay.brevo.com`
   - Port: `587`
   - Username: Brevo login (email)
   - Password: SMTP key из шага 3
   - Minimum interval between emails: `60`
3. Нажми **Save**

### 5. Настройка шаблона письма (OTP-only)

1. **Authentication → Email Templates → Magic Link**
2. Замени Subject на:
   ```
   Код входа в LMERC: {{ .Token }}
   ```
3. Замени тело письма на:
   ```html
   <h2>LMERC — код входа</h2>
   <p>Здравствуйте!</p>
   <p>Ваш код для входа в LMERC:</p>
   <p style="font-size:28px;letter-spacing:6px;font-weight:bold;font-family:monospace;background:#f5f5f5;padding:12px 20px;display:inline-block;border-radius:4px;">{{ .Token }}</p>
   <p>Код действителен 60 минут. Если вы не запрашивали вход — просто проигнорируйте письмо.</p>
   <p style="color:#888;font-size:12px;margin-top:24px;">© LMERC</p>
   ```
4. Нажми **Save**

> Важно: шаблон **Magic Link** в Supabase используется и для OTP (`signInWithOtp`), несмотря на название. Мы используем только `{{ .Token }}` и игнорируем `{{ .ConfirmationURL }}`.

### 6. Настройка срока жизни кода (опционально)

- **Authentication → Settings → Security**
- OTP Expiration: по умолчанию 3600 секунд (1 час). Можно сократить до 600 (10 минут) для безопасности.

### 7. Rate limits (опционально)

- **Authentication → Settings → Rate Limits**
- Настрой лимиты (например, 5 OTP/час с одного IP) чтобы предотвратить abuse

## Тестирование

1. Запусти локально: `npm run dev`
2. Открой http://localhost:5173
3. Нажми **Войти** в шапке
4. Введи свой email → жди письмо (проверь inbox + spam/promo)
5. Введи 6-значный код из письма → должен произойти вход
6. В Supabase **Table Editor → profiles** должен появиться новый профиль

## Типичные проблемы

| Проблема | Решение |
|----------|---------|
| Письмо в спаме | Подтверди sender, добавь DKIM/SPF для своего домена |
| "SMTP settings invalid" в Supabase | Проверь правильность SMTP key (не API key!) и логина |
| Код не работает | Проверь OTP Expiration — возможно, код истёк |
| "Email rate limit exceeded" | Увеличь Rate Limits в Supabase или подожди |
| Brevo free tier: 300/день | Достаточно для теста. Для продакшна — Brevo Lite (~$25/мес, 20k) |

## Что НЕ требуется менять в коде

- `src/hooks/useAuth.ts` — уже использует `signInWithOtp` + `verifyOtp`
- `src/features/auth/AuthModal.tsx` — уже чистый OTP-флоу без magic-link
- `src/lib/supabase.ts` — уже настроен на VITE_SUPABASE_URL/ANON_KEY
- Все RLS-политики, таблицы, API-слой — работают без изменений
