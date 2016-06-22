## Краткое описание

Реализация тестового задания про книги, магазины и авторов.
* Поддерживаются все CRUD операции,
* Поддержка поиска по части названия (авторов, книг)
* API максимально RESTful,
* Авторизация JSONWEBTOKEN с поддержкой списка недействительных токенов,
* Роли пользователей,
* MongoDb

Облегченная версия, практически не содержит валидаторов принимаемых данных, классы для сущностей не используются.

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

## Порядок действий

1. При первом запуске необходимо создать администратора. Это делается автоматически, нужно лишь передать запрос `GET /setup`
2. Чтобы залогиниться, нужно передать запрос `POST /users`, прикрепив к нему данные в виде JSON:
    { login: admin,
    password: admin }
3. В папке `doc` содержится эспорт из  Postman всех запросов для проверки API, а также экспорт тестовой БД.