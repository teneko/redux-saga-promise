# [4.0.0](https://github.com/teneko/redux-saga-promise/compare/3.0.1...4.0.0) (2025-11-22)


### Features

* adapt to breaking changes of redux 5.0.1 ([80a4813](https://github.com/teneko/redux-saga-promise/commit/80a4813fa39249303d2297a076dc60104b155723))



## <small>3.0.1 (2024-05-19)</small>

* chore: release 3.0.1 ([74dd38a](https://github.com/teroneko/redux-saga-promise/commit/74dd38a))
* refactor: ensure integrity of middleware-surpassed promise-action by introducing check of the presen ([b96e407](https://github.com/teroneko/redux-saga-promise/commit/b96e407))
* build: updated dependencies ([b657ffa](https://github.com/teroneko/redux-saga-promise/commit/b657ffa))



## 3.0.0 (2021-12-03)

* chore: release 3.0.0 ([d148fb4](https://github.com/teroneko/redux-saga-promise/commit/d148fb4))
* feat: promise action is now typed and usable as promise ([8f7c60e](https://github.com/teroneko/redux-saga-promise/commit/8f7c60e))
* docs: added missing createAction-equivalent case ([01ac73e](https://github.com/teroneko/redux-saga-promise/commit/01ac73e))
* docs: fixed spelling mistakes ([c9f6960](https://github.com/teroneko/redux-saga-promise/commit/c9f6960))


### BREAKING CHANGE

* Each promise action can now be awaited at root after it has been surpassed the promise middleware without accessing it through promiseAction.meta.promise first.


## <small>2.0.2 (2021-12-02)</small>

* chore: added CHANGELOG.md ([5fe0f66](https://github.com/teroneko/redux-saga-promise/commit/5fe0f66))
* chore: release 2.0.2 ([6949f1d](https://github.com/teroneko/redux-saga-promise/commit/6949f1d))
* docs: fixed headline ([eeec472](https://github.com/teroneko/redux-saga-promise/commit/eeec472))
* docs: updated keywords in package.json ([c4c2fa0](https://github.com/teroneko/redux-saga-promise/commit/c4c2fa0))
* docs: updated README.md ([7f70061](https://github.com/teroneko/redux-saga-promise/commit/7f70061))



## <small>2.0.1 (2021-11-25)</small>

* build: release 2.0.1 ([e80d86d](https://github.com/teroneko/redux-saga-promise/commit/e80d86d))
* docs: updated README.md to reflect latest changes ([25927af](https://github.com/teroneko/redux-saga-promise/commit/25927af))



## 2.0.0 (2021-11-25)

* build: release 2.0.0 ([f5f4aaf](https://github.com/teroneko/redux-saga-promise/commit/f5f4aaf))
* fix: added dummy test to prevent jest error ([170c8c2](https://github.com/teroneko/redux-saga-promise/commit/170c8c2))
* feat: replaced simple(..) and advanced(..) ([e600541](https://github.com/teroneko/redux-saga-promise/commit/e600541))
* intermediate ([c9cd772](https://github.com/teroneko/redux-saga-promise/commit/c9cd772))
* test: added tests for testing required payload ([245b7de](https://github.com/teroneko/redux-saga-promise/commit/245b7de))
* test: added tests for typeof <action>.types-members ([31146b7](https://github.com/teroneko/redux-saga-promise/commit/31146b7))



## <small>1.2.3 (2021-11-25)</small>

* build: release 1.2.3 ([764448c](https://github.com/teroneko/redux-saga-promise/commit/764448c))
* refactor: types has been completely redesigned ([a896524](https://github.com/teroneko/redux-saga-promise/commit/a896524))



## <small>1.2.2 (2021-11-14)</small>

* Added further hints to error messages ([f3ca9e6](https://github.com/teroneko/redux-saga-promise/commit/f3ca9e6))
* Bump to 1.2.2 ([f1b5cd6](https://github.com/teroneko/redux-saga-promise/commit/f1b5cd6))



## <small>1.2.1 (2021-11-01)</small>

* Bumped version to 1.2.1 ([de9ee5a](https://github.com/teroneko/redux-saga-promise/commit/de9ee5a))
* Resolved and rejected actions have now typed payload ([bdc0104](https://github.com/teroneko/redux-saga-promise/commit/bdc0104))



## 1.2.0 (2021-11-01)

* Bumped version to 1.2.0 ([fabd42c](https://github.com/teroneko/redux-saga-promise/commit/fabd42c))
* Changed types.resolveValue to rtypes.resolvedValue ([2201494](https://github.com/teroneko/redux-saga-promise/commit/2201494))
* Updated documentation ([bf9dc60](https://github.com/teroneko/redux-saga-promise/commit/bf9dc60))



## 1.1.0 (2021-10-29)

* Bumped version to 1.1.0 ([571d943](https://github.com/teroneko/redux-saga-promise/commit/571d943))
* Renamed types.action to types.triggerAction ([e5a1605](https://github.com/teroneko/redux-saga-promise/commit/e5a1605))



## <small>1.0.2 (2021-10-29)</small>

* Added LICENSE ([8c687fc](https://github.com/teroneko/redux-saga-promise/commit/8c687fc))
* Added resolveValue to types ([40c74fb](https://github.com/teroneko/redux-saga-promise/commit/40c74fb))
* Bump version to 1.0.2 ([e2c7b27](https://github.com/teroneko/redux-saga-promise/commit/e2c7b27))
* Changed from build to test before publish ([0411449](https://github.com/teroneko/redux-saga-promise/commit/0411449))
* Changed from prepublish to prepublishOnly ([b75607b](https://github.com/teroneko/redux-saga-promise/commit/b75607b))
* implementPromiseAction supports now iterator and (async) function ([2b6ad05](https://github.com/teroneko/redux-saga-promise/commit/2b6ad05))
* Initial commit ([8114680](https://github.com/teroneko/redux-saga-promise/commit/8114680))
* Project is now built before pulished ([9ed9695](https://github.com/teroneko/redux-saga-promise/commit/9ed9695))
* Updated package.json ([7890293](https://github.com/teroneko/redux-saga-promise/commit/7890293))
* Updated README.md ([3173e57](https://github.com/teroneko/redux-saga-promise/commit/3173e57))
* Updated README.md ([7a94366](https://github.com/teroneko/redux-saga-promise/commit/7a94366))



