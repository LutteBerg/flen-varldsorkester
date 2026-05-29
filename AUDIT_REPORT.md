# Аудит кода, безопасности и дизайна

Дата проверки: 2026-05-22  
Проект: Vite + React + Cloudflare Pages Functions + D1  
Важно: код приложения не менялся. Этот файл - только отчет.

## Что проверено

- `npm audit --omit=dev --json`: уязвимостей в production-зависимостях не найдено.
- `npx vite build --outDir "$env:TEMP\orchester-build-audit" --emptyOutDir`: production-сборка проходит.
- `npx eslint src functions scripts vite.config.js eslint.config.js`: 28 проблем в реальном коде: 24 errors, 4 warnings.
- `npm run lint`: 181 проблема, потому что линтер дополнительно залезает в `.claude/worktrees` и дублирует ошибки из служебных копий.
- Через браузер проверены `/`, `/flen-varldsorkester`, `/flen-varldsorkester/galleri?tab=video` на desktop/mobile.

## Самое важное

1. YouTube URL ломается, если `embedUrl` уже содержит query string. Это вероятная причина проблем с плеером/autoplay.
2. У админ-логина нет rate limiting/lockout, поэтому пароль можно брутфорсить.
3. CMS-ссылки вставляются напрямую в `href`, без проверки протокола/домена.
4. Есть горизонтальный скролл из-за отрицательных margin вокруг `SocialCTA`.
5. На главной Facebook-кнопка упирается в первую карточку, на mobile это выглядит как наложение.
6. Линтер сейчас шумит из-за `.claude/worktrees`, плюс есть реальные lint-ошибки в исходниках.

## P1: YouTube-плеер получает неправильный URL

Файлы:

- `src/components/VideoEmbed.jsx:36`
- `src/components/VideoEmbed.jsx:53`
- `src/lib/cms/adapters/seedAdapter.js:46`
- `src/lib/cms/adapters/seedAdapter.js:75`

Проблема: `VideoEmbed` добавляет параметры через `?`, даже если `src` уже содержит `?si=...`.

Фактически в браузере сейчас получается:

```text
https://www.youtube.com/embed/ZVrUFPsHRkE?si=RN8psEBjMgTFzMEx?autoplay=1&mute=1...
https://www.youtube.com/embed/ZVrUFPsHRkE?si=RN8psEBjMgTFzMEx?rel=0
```

Второй `?` становится частью значения `si`, поэтому `autoplay`, `mute`, `controls`, `rel` могут не применяться. В dev-режиме это приходит из `SeedAdapter`, где `embedUrl` равен исходному `v.url`.

Как исправить:

- В `SeedAdapter` хранить канонический `embedUrl` через общий `normalizeYouTubeUrl(v.url)?.embedUrl`, а не `v.url`.
- В `VideoEmbed` собирать URL через `new URL(src)` и `url.searchParams.set(...)`, либо всегда строить canonical src из `videoId`.
- Для inline/background сделать общий helper вроде `buildYouTubeEmbedUrl(src, params)`.

## P1: Нет защиты от перебора пароля админки

Файлы:

- `functions/api/admin/login.js:14-27`
- `functions/_middleware.js:14-18`

Проблема: `/api/admin/login` публичный, но нет лимита попыток, cooldown, блокировки по IP или Turnstile. В `CMS_SETUP.md` это тоже отмечено как текущее ограничение.

Как исправить:

- Добавить rate limit на Cloudflare стороне: IP + временное окно, например через KV/D1 или Cloudflare Turnstile.
- После нескольких неудачных попыток вводить задержку или временную блокировку.
- Логировать только агрегированные попытки, не пароль и не чувствительные данные.

## P1: CMS-ссылки попадают напрямую в href

Файлы:

- `functions/api/admin/site-settings.js:23-26`
- `src/pages/Home.jsx:42`
- `src/components/SocialCTA.jsx:19`
- `src/pages/Contact.jsx:37`
- `src/components/Layout.jsx:71`

Проблема: `site-settings` принимает любую строку URL, а React потом вставляет ее в `href`. Админ или скомпрометированная админ-сессия может сохранить `javascript:...`, фишинговый URL или другой небезопасный протокол.

Как исправить:

- На сервере валидировать URL перед сохранением.
- Разрешить только `https:` для соцсетей.
- Для Facebook/YouTube дополнительно проверять hostname: `facebook.com`, `www.facebook.com`, `youtube.com`, `www.youtube.com`, `youtu.be`.
- На клиенте не рендерить ссылку, если URL не прошел проверку.

## P2: Горизонтальный скролл из-за отрицательных margin

Файлы:

- `src/pages/Section.jsx:199`
- `src/pages/ChildPage.jsx:83`
- `src/pages/Contact.jsx:44`

Проблема: `SocialCTA` обернут в `div` с `marginLeft: '-24px'` и `marginRight: '-24px'`. На `/flen-varldsorkester` браузер показал `scrollWidth: 1374` при `clientWidth: 1350`, то есть страница шире viewport и появляется горизонтальная полоса.

Как исправить:

- Убрать отрицательные margin.
- Если нужен full-bleed блок, сделать это CSS-классом безопасно: `width: 100vw; margin-left: calc(50% - 50vw);`.
- Либо вынести `SocialCTA` из ограниченного контейнера и управлять отступами внутри самого компонента.

## P2: Facebook-кнопка на главной прилипает к первой карточке

Файлы:

- `src/pages/Home.jsx:40-46`
- `src/pages/Home.css:1-4`

Проблема: блок с Facebook-кнопкой имеет только `marginTop: 24px`, но нет нижнего зазора. На desktop и mobile кнопка визуально упирается в первую карточку/картинку.

Как исправить:

- Заменить inline style на класс, например `.hero-actions`.
- Добавить `margin-bottom: 40px` или сделать `.hero-section` flex-column с `gap`.
- Проверить mobile отдельно: на 390px кнопка должна иметь воздух до первой карточки.

## P2: Hero-видео сделано как фон, а не как нормальный плеер

Файлы:

- `src/components/VideoEmbed.jsx:35-48`
- `src/pages/Section.css:26-35`
- `src/pages/Section.css:47-57`

Проблема: для `mode="background"` iframe получает `controls=0`, wrapper и iframe получают `pointer-events: none`. Это правильно для декоративного видео-фона, но если ожидается обычный плеер, пользователь не сможет нажать play, открыть YouTube controls или включить звук.

Как исправить:

- Разделить режимы: `background` для декоративного autoplay-фона и `featured`/`inline` для управляемого плеера.
- Если hero должен проигрываться "нормально", не использовать `pointer-events: none` и `controls=0`.
- Для фонового режима оставить отдельный poster/fallback и не ожидать пользовательского управления.

## P2: Background iframe лениво грузится

Файл:

- `src/components/VideoEmbed.jsx:45`

Проблема: у первого viewport hero-видео стоит `loading="lazy"`. Для autoplay background-видео это может задерживать загрузку и создавать ощущение, что плеер не стартует.

Как исправить:

- Для `mode="background"` использовать `loading="eager"` или убрать lazy.
- Для обычных inline-видео ниже по странице `loading="lazy"` оставить.

## P2: Админка почти не адаптирована под mobile

Файл:

- `src/pages/admin/Admin.css:1-84`

Проблема: `.admin-layout` всегда `display: flex`, sidebar всегда `width: 260px`, таблицы и формы не имеют mobile-перестройки. На узком экране админка будет давать горизонтальный скролл и тесные таблицы.

Как исправить:

- Добавить breakpoint до 768px: sidebar сверху или off-canvas меню.
- Таблицы на mobile превращать в карточки или дать контейнер с контролируемым `overflow-x: auto`.
- Проверить формы `Events`, `News`, `ChildPages`, где много inline grid/style.

## P2: ESLint сканирует служебные worktrees

Файл:

- `eslint.config.js:8`

Проблема: `globalIgnores(['dist'])` не исключает `.claude`, `.wrangler`, `node_modules`. Поэтому `npm run lint` возвращает 181 проблему вместо реальных 28.

Как исправить:

```js
globalIgnores(['dist', 'node_modules', '.claude', '.wrangler'])
```

После этого чинить уже реальные ошибки.

## P2: Реальные lint-ошибки в исходниках

Файлы:

- почти все React-файлы: `import React from 'react'` не используется
- `src/components/Layout.jsx:13`
- `src/pages/admin/Sections.jsx:11`
- `src/pages/admin/News.jsx:12`
- `src/pages/admin/Events.jsx:12`
- `src/pages/admin/ChildPages.jsx:25`
- `functions/api/_lib/content.js:37`
- `functions/api/content.js:11`
- `functions/lib/auth.js:87`

Проблема: React 17+ с новым JSX runtime не требует default `React` import. Есть также `useEffect` dependency warnings и unused catch variables.

Как исправить:

- Удалить default `React` imports, оставить только `{ useState, useEffect }`.
- В admin pages либо завернуть `load` в `useCallback`, либо объявить `load` внутри `useEffect`.
- Для unused catch variables использовать `catch { ... }`.
- Для закрытия мобильного меню в `Layout` лучше закрывать меню по клику на nav-link или аккуратно обработать lint-правило.

## P3: Много inline styles затрудняют дизайн-правки

Файлы:

- `src/pages/Home.jsx`
- `src/pages/Section.jsx`
- `src/pages/ChildPage.jsx`
- `src/pages/Contact.jsx`
- `src/pages/admin/*.jsx`

Проблема: отступы, сетки и размеры разбросаны inline-стилями. Из-за этого появляются "вечные" расхождения: где-то `marginTop: 60px`, где-то `padding: 80px 32px`, где-то отрицательные margin.

Как исправить:

- Вынести повторяющиеся spacing tokens/classes: `.page-section`, `.section-spacer`, `.full-bleed`, `.hero-actions`.
- Для admin сделать отдельные классы вместо inline grid/table/button styles.
- Проверять desktop + 390px mobile после каждой правки.

## P3: Мусор/мертвый код

Файлы:

- `src/App.css`
- `src/assets/react.svg`
- `src/assets/vite.svg`

Проблема: `App.css` содержит шаблонные стили Vite (`.counter`, `#center`, `#next-steps`, `.ticks`) и нигде не импортируется. `react.svg` и `vite.svg` тоже не используются.

Как исправить:

- Если файл точно не нужен, удалить `src/App.css`, `src/assets/react.svg`, `src/assets/vite.svg`.
- Если нужен, импортировать явно и удалить шаблонные селекторы.

## P3: Нет `_headers` с базовыми security headers

Файл отсутствует:

- `public/_headers`

Проблема: нет явной CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. Это не ломает сайт, но снижает защиту от XSS/инъекций и лишних browser capabilities.

Как исправить:

- Добавить `public/_headers`.
- CSP придется собрать аккуратно, потому что используются Google Fonts, YouTube iframe, YouTube thumbnails и локальные assets.

## P3: Публичный `/api/health` раскрывает наличие env vars

Файл:

- `functions/api/health.js:1-18`

Проблема: endpoint не раскрывает значения секретов, но показывает, какие bindings/secrets настроены. В комментарии сказано удалить после setup, но сейчас он остается публичным.

Как исправить:

- После завершения настройки удалить endpoint или закрыть его админской авторизацией.
- Если он нужен для мониторинга, возвращать только `ok` без детализации secrets.

## Рекомендуемый порядок исправления

1. Починить YouTube URL builder и `SeedAdapter` canonical `embedUrl`.
2. Добавить rate limit на `/api/admin/login`.
3. Добавить server-side валидацию внешних URL.
4. Убрать отрицательные margin вокруг `SocialCTA` и добавить нормальный зазор под hero CTA на главной.
5. Настроить ESLint ignores, затем убрать реальные lint errors.
6. Убрать мертвый Vite-код и unused assets.
7. Добавить базовые security headers.

