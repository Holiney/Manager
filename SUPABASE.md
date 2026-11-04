# Збереження даних у Supabase

1. supabase.com -> New project (безкоштовний план).
2. SQL Editor -> New query -> вставити вміст `supabase/schema.sql` -> Run.
3. Authentication -> Providers -> Email: для простоти вимкнути "Confirm email" (інакше після реєстрації треба підтвердити пошту листом).
4. Project Settings -> API: скопіювати **Project URL** і **anon public key**.
5. Vercel -> Project -> Settings -> Environment Variables:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = anon public key
   Потім Redeploy (Deployments -> ... -> Redeploy).
6. Відкрити додаток, створити акаунт (пошта + пароль). Дані, які вже були на пристрої, об'єднаються з серверними й завантажаться.

Без ключів додаток працює як раніше: дані лише в браузері.

## Фото
Щоб фото зберігалися на сервері, виконайте в SQL Editor також нижню частину `supabase/schema.sql` (блок «Photos»). Без цього фото лишаються тільки в браузері пристрою, де їх додали. Копія через «Зберегти файл» фото не містить.
