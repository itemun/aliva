# Проверка версии 1.0.0 — 17.11.2026

`node --test outputs/aliva/tests/rules.test.cjs`: 14 тестов. Проверяется и код, встроенный в итоговый HTML. Медицинской экспертизой эти тесты не являются.

Через Computer Use, только синтетические данные:

- Мужчина55, рост180, вес90, талия100, курит40лет по10сигарет, диабет2:19пунктов, ИМТ27,8 и20пачка-лет. Есть наблюдение диабета и обсуждение НДКТ.
- Изменение на «диабет не диагностирован»: добавлен скрининг глюкозы, удалены5пунктов наблюдения диабета, осталось15пунктов.
- Пример «женщина45» не перезаписывает ответы анкеты.
- Все20экранов мужского сценария ×3вкладки проверены на320×480,812×375,1024×600,390×844. Женский пример — также на320×480 и812×375. Прокрутки страницы и перекрытия кнопок нет.

## Исправление скачущей шапки

Причина: переменная высота карточки и вертикальное центрирование `.stage`. Теперь высота результата постоянная в пределах доступного экрана, шапка сверху, гибкая область текста посередине, вкладки и навигация снизу. Анимация перемещения результата отключена. Анкета и замороженный снимок не изменены этой правкой.

После исправления проверены все16экранов женского примера ×3вкладки ×3размера (320×480,812×375,1440×900). Координаты карточки, шапки, начала текста, вкладок и кнопок совпадают при переходах; нет переполнения и пересечений. Для обзора на всех трёх вкладках:

| Экран | Верх шапки | Верх текста | Верх вкладок | Верх кнопок |
|---|---:|---:|---:|---:|
| 320×480 | 60 | 102 | 307,5 | 349,5 |
| 812×375 | 50 | 85 | 231 | 266 |
| 1440×900 | 238,75 | 284,75 | 535,75 | 587,75 |

Проверка viewport не является сертификацией физических смартфонов и экранной клавиатуры. При экстремальном увеличении шрифта доступность важнее запрета прокрутки; не скрывать проблемы через overflow:hidden.

Контрольная сумма замороженного снимка 2026-11-17-v1 проверена, совпадает.

## Версия 1.1.0 — 17.11.2026

17 автоматических тестов прошли. Добавлены стоматолог, сверка истории прививок и необязательная маршрутизация после результата.

Computer Use:

- Полная короткая анкета: женщина45, без известных диагнозов, никогда регулярно не курила, измерения пропущены →17пунктов, ИМТ не выдуман.
- Ответ «Да» в черновике уточнения + отмена → прежние17пунктов. При повторном открытии черновой ответ не отмечен.
- Все3уточнения «Да» + подтверждение →20пунктов; три соответствующих пункта стоят первыми. Уточнения не добавляют инструментальные обследования автоматически.
- Все7страниц списка на320×480: полные названия переносятся, прокрутки и обрезания нет.
- Все21экранов уточнённого плана ×3вкладки проверены на320×480 и812×375; геометрия результата стабильна, переполнений нет.
- Все18экранов базового примера ×3вкладки проверены на1440×900 и1024×600; переполнений нет.
- Анкета и результат имеют одинаковые размеры и положение: на320×480 высота402px и верх43px; на1440×900 высота440px и верх239,75px; на1024×600 высота440px и верх87,75px.

Источник проверки стоматологии: NHS Dental check-ups, проверено17.11.2026. Для прививок добавлена только сверка истории по1122н, без персональных доз и дат.

## PDF / feedback — 17.11.2026

- `node outputs/aliva/build.cjs`; `node --test outputs/aliva/tests/*.test.cjs`: 21/21 passing.
- PDF tests cover purposes for every reachable rule, 17/28/20-item exports, valid checklist destinations and source URLs, invalid-plan rejection, expired-version warning, no plan mutation, matching inline sources. Medical engine unchanged.
- Synthetic PDFs: woman 45 (17 items, 14 pages); woman 65 with type 2 diabetes, current smoking and three positive refinements (28 items, 20 pages); man 50 with unknown smoking details / diabetes type (20 items, 15 pages).
- pypdf checks: every selected title on page 1, every selected detail present, no undefined/NaN. pdfplumber checks character bounds on all pages. Link targets checked with pdf-lib.
- Rendered all 14 example pages using Poppler, inspected contact sheet plus full-size checklist and BMI page; inspected the 28-item checklist. No clipping or unsupported Cyrillic glyphs found.
- Actual CUA download: `/Users/macbook/Downloads/aliva-example-2026-11-17.pdf`; extracted text matches delivered sample page for page. No test email sent.
- Feedback screen fits 320×480, 390×844, 812×375, 1024×600, 1440×900 without document/stage overflow. Overview fits 320×480, 812×375, 1440×900. Simulated keyboard viewport 360×300 with focused textarea fits. Empty-feedback validation and return to plan verified. Card height stays 440 where space allows, 402 at 320×480.
- Screenshots: `aliva-feedback-mobile.jpg`, `aliva-pdf-desktop.jpg`. Example: `/Users/macbook/exp/nfac/output/pdf/aliva-plan-example.pdf`.
- Limits: delivery depends on the user's email client; no direct form backend or delivery confirmation. Viewport checks are not physical-device certification. No independent clinical review.

### PDF feedback link correction — 17.11.2026

- Rebuilt standalone HTML and all three synthetic PDFs. 22/22 Node tests pass, including URL privacy (query and credentials stripped) and absence of mailto annotations in exported documents.
- pypdf extraction across all three PDFs confirms no recipient email in text or URI annotations; expected local #feedback link present. Last page of the updated example rendered and inspected.
- CUA opened the exact local #feedback URL: form appears immediately without questionnaire completion. Back returns to the questionnaire without a null-plan error and removes the feedback fragment.
- Screenshot: aliva-feedback-link.jpg. Local preview server uses loopback port 8770; the local link requires that server to be running.

## 23.11.2026 — Kazakhstan rules 1.2.0
- Official consolidated 174/2020 and July2026 changes read; October139 checked as future-effective January2027. Extracted legal texts saved under research/kazakhstan/.
- 27 tests passed, including country/sex/age/diabetes matrix, missing occupational risks, interval differences, valid PDF links and Kazakh font coverage.
- Compared all item text for 824 Russian profiles before/after: unchanged.
- Browser: selected Kazakhstan, female45, no diabetes, never smoking; 11 items. Switched to Russia and back through Edit answers; retained previous values and recalculated list. Actual PDF Blob download succeeds.
- Desktop1490×713 and mobile390×844,320×568: overview/source tabs fit stage, no horizontal overflow. Approved colors/logo unchanged.
- Rendered all17 pages of synthetic KZ male65 with optional risk routes, inspected contact sheet and detailed page7. Verified correct Қ in source number after replacing reduced fonts with full Liberation Sans2.1.5. Additional female45 and female76/type2 PDFs generated (13/14 pages), all export validations passed. No Russian-source references in KZ national items.
- These are software/source/layout checks, not independent clinical validation.

## 23.11.2026 — 1.3.0, общая основа / ВОЗ / ближайший возраст

- 29 тестов rules/pdf прошли. Проверяются прежняя валидация/приватность/детерминированность, одинаковый core для стран, отдельные национальные ограничения, единственный пункт на тему, BMI35–70/25 без округления, будущие пороги40/65 и без выдуманного стажа, unknown country без РФ.
- PDF: покрытие пояснениями всех выходных ID, ссылки первой страницы на действительные страницы деталей (не страницу ВОЗ), четыре WHO-ссылки именно на странице2, непрерывная пагинация, текущий код встроен в оба HTML.
- Синтетический мужчина39, ИМТ25,5, не курит, диабета нет: КЗ9пунктов (7 текущих +2к40), РФ13 (11+2к40), other6. Срок/метод HbA1cРК к40 показан в уже существующей проверке на диабет, второй анализ не создаётся.
- Синтетический максимальный профиль в проверенной матрице: женщина64, диабет2, курение20+пачка-лет и3положительных уточнения:28пунктов,26страниц; первая страница содержит все28. Просмотрены контактные листы всего максимального PDF и КЗ39, отдельные страницы1–3 в большем масштабе. pdfplumber: ни один символ основного текста не выходит за нижнюю границу783pt. Шрифт, крем/терракота и векторное лого сохранены.
- Browser: localhost8770 запущен, версия1.3.0. Пройдена анкета КЗ39 до результата; скачивание через реальную кнопку сформировало14страниц,9ссылок в чек-листе,4источника на странице2. На390×844 и320×640 нет горизонтального переполнения; main/details/source помещаются в result-body. Проверены desktop1490×713 и мобильные состояния; это эмуляция, не физические устройства.
- Пример для просмотра: output/pdf/aliva-example-kazakhstan.pdf — только вымышленные данные. Скрипт воспроизведения: tmp/pdfs/create-v13-samples.cjs.
- Это техническая проверка. Независимая клиническая экспертиза не проведена; подробные ограничения и источники в RULES.md.

### Обязательная страна — 23.11.2026
Только Россия/Казахстан; пустая/неподдерживаемая страна отклоняется и на первом шаге, и в buildPlan. 29 тестов прошли. В браузере проверены: начальное отсутствие выбора, ошибка и фокус на стране, переход после ru и kz, сохранение при возврате, мобильный390×844 без горизонтального переполнения. Клиническая матрица выбранных стран и PDF не менялись.

### Фокус select — 23.11.2026
Страна и диабет: проверены change после pointerdown (фокус снят), после keydown (фокус сохранён), сохранение значения. Desktop screenshot после выбора диабета: обычная светлая рамка. Mobile390×844: реальный click по стране и выбор через browser fill, фокус снимается. Собраны обе страницы, src/app.js проходит node --check. CSS и медицинская логика не менялись.


### AAA, версия 1.3.1 — 23.11.2026
32 теста правил/PDF прошли. Новые проверки: мужчины65–75, будущий пункт к65, отсутствие рутинного пункта женщинам/вне диапазона, обе страны, отсутствие порога20пачка-лет и ограничения15годами отказа, неизвестный стаж, индивидуальная ветка never. Тесты PDF проверили новый ID, реальные страницы ссылок и источник.
Синтетический КЗ65:18пунктов,23страницы; страница14 с новым пунктом отрисована и просмотрена, текст не выходит за границы. Обновлённая страница в браузере отдаёт1.3.1 и сформировала PDF для синтетического РФ65 с давним отказом от курения (18страниц). Обе HTML-сборки обновлены; app.js проходит node --check. Независимой клинической экспертизы не было.

### Приложение и конверсии — 23.11.2026
34 теста прошли, включая два теста разрешённых целей, отсутствия передачи профиля, работы без счётчика и при ошибке адаптера. В браузере на1490px: обе кнопки открывают dialog, Escape/«Понятно» закрывают, фокус возвращается на инициатор, введённые тестовые ответы сохраняются. Stub ym получил ровно четыре вызова с id/методом/именем цели, без параметров анкеты: оба магазина, пример PDF и личный PDF. Повторный клик во время генерации не дублируется; искусственная ошибка PDF показывает сообщение и не создаёт цель. Эмуляции390×844 и320×640: блок ниже анкеты, страница и диалог без горизонтального переполнения, диалог помещается в экран. Просмотрены desktop/mobile screenshots и диалог. Счётчик в сеть не подключён; проверен адаптер, не доставка реальному Яндексу.

### Обязательные измерения и тексты — 23.11.2026
В desktop-браузере проверены последовательные блокировки пустого роста/веса/талии, фокус нужного поля, запрет талии0/301, успешный переход с92,5см, сохранение чисел при возврате. Все три input имеют required, флажков неизвестных измерений нет. Мобильная эмуляция390×844: шаг измерений и ошибка без горизонтального переполнения; screenshot просмотрен. Собраны обе страницы, app.js проходит синтаксическую проверку. Медицинские критерии не менялись.

### Выравнивание и прокрутка — 23.11.2026
Desktop1440×800: все5 кнопок начала из hero, шапки, меню, how и example приводят к одному положению с remainingScroll=0; границы .card/.app-preview совпадают. Desktop1490×713: remainingScroll=0, верх обеих колонок115,7px при нижней границе шапки90,3px, низ615,7px, футер до713,2px (округление браузера). Mobile390×844: анкета начинается95,8px при нижней границе шапки80px, полностью видна, горизонтального переполнения нет; приложение ниже. Просмотрены screenshots desktop/mobile. Собрана concept-страница, interactions.js проходит node --check. Расчёт, PDF и аналитика не менялись.

### Ошибки без скачков — 23.11.2026
Проверены пустой возраст → ошибка → заполнение, а также ошибка обязательного роста. На1440×800 геометрия .card/.app-preview/#next/.store-buttons одинакова до/после ошибки и исправления, обе колонки550px; футер доступен при переходе (remainingScroll=0). На390×844 карточка560px, положение кнопки и блока приложения не меняется, stage311px без переполнения. На320×640 карточка590px, stage347px без переполнения первого шага, горизонтального overflow нет. Скриншот390px просмотрен. Пересобрана concept-страница; изменения только в CSS.


### Адаптивность — 23.11.2026
Проверены 24 размера Chrome DevTools от320×480 до3840×2160, включая планшеты, горизонтальные телефоны и границы CSS-сетки. После исправлений сценарий не выявляет горизонтальных переполнений, перекрытий шапки и смещения колонок при ошибках. Пройдены все основные шаги анкеты, ветка бывшего курения, подсказка талии, три вкладки результата и модальное окно. На горизонтальном телефоне исправлен текст под шапкой; Escape в окне приложения больше не сбрасывает результат. 34 теста rules/pdf/analytics прошли. Полный отчёт и ограничения: RESPONSIVE-QA.md; воспроизводимый сценарий: tests/responsive.browser.js. Это эмуляция Chrome, не проверка реальных Safari/iOS/Android.


### Вакцинация взрослых в PDF — 23.11.2026
34 теста прошли, расширена проверка PDF: ссылка vaccines ведёт на отдельную страницу, другие пункты не ведут на неё; источники содержат WHOгрипп и выбранную страну, не другую. Синтетический мужчина42: РФ15страниц, КЗ14; памятка на5-й странице в обоих образцах. Проверены PDFplumber текст заголовка/таблицы/страны и нижние границы текста всех страниц; страницы прививок отрендерены Poppler и осмотрены в полном размере, остальные — на контактных листах. Таблица предназначена для записей от руки. Browser offline create с КЗ успешно дал14страниц. Пересобраны обе HTML-страницы, эталон69файлов проверен поSHA256 и не изменён.
