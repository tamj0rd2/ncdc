# [2.1.0](https://github.com/tamj0rd2/ncdc/compare/v2.0.1...v2.1.0) (2020-11-27)


### Features

* add support for typescript 4.1.2 ([fd394f3](https://github.com/tamj0rd2/ncdc/commit/fd394f350e66c2262bd530a4ff431316fe242ef9))

## [2.0.1](https://github.com/tamj0rd2/ncdc/compare/v2.0.0...v2.0.1) (2020-10-30)


### Bug Fixes

* **generate:** fix generate command producing files with wrong name ([2e32feb](https://github.com/tamj0rd2/ncdc/commit/2e32feb608b9893378bafa404e33441996c9b8fe)), closes [#535](https://github.com/tamj0rd2/ncdc/issues/535)

# [2.0.0](https://github.com/tamj0rd2/ncdc/compare/v1.0.0...v2.0.0) (2020-10-29)


### chore

* upgrade to typescript 4 ([e0d8800](https://github.com/tamj0rd2/ncdc/commit/e0d88006f1aeb2f03e1f0446093cdb5589d827e3)), closes [#405](https://github.com/tamj0rd2/ncdc/issues/405)
* **deps:** make typescript a peer dependency ([97c68c2](https://github.com/tamj0rd2/ncdc/commit/97c68c2a1fd55377ee5dfe2d9238c1c830448a7b))


### Reverts

* revert ts-json-schema-update ([8129fe8](https://github.com/tamj0rd2/ncdc/commit/8129fe8ba019293d1de3b2e9e366895723d963d4))
* revert typescript update ([8f752ad](https://github.com/tamj0rd2/ncdc/commit/8f752ad78f39e4e29b92827176018088f945492e))
* revert version bump ([9f4e5b3](https://github.com/tamj0rd2/ncdc/commit/9f4e5b34a1d136c06ba9ee8b1b89f0e126bc92b8))
* undo merge from alpha ([7be0447](https://github.com/tamj0rd2/ncdc/commit/7be0447f9a21a89525680c77db48d8bfe926c082))


### BREAKING CHANGES

* Upgrade typescript dependency to version 4
* **deps:** Typescript is no longer a dependency of this project.
It is a peer dependency and you will need to install it yourself

# [0.14.0](https://github.com/tamj0rd2/ncdc/compare/v0.13.2...v0.14.0) (2020-09-23)


### Features

* add support for url-encoded bodies ([9a46997](https://github.com/tamj0rd2/ncdc/commit/9a469971cbf90e1cb94457941c8f12c0fcb4aa0f))

## [0.13.2](https://github.com/tamj0rd2/ncdc/compare/v0.13.1...v0.13.2) (2020-08-27)


### Bug Fixes

* **serve:** fix project reference related crash ([71f949e](https://github.com/tamj0rd2/ncdc/commit/71f949e95210b9a8da4de0b54f6af52ecb6daab3)), closes [#401](https://github.com/tamj0rd2/ncdc/issues/401)

## [0.13.1](https://github.com/tamj0rd2/ncdc/compare/v0.13.0...v0.13.1) (2020-08-21)


### Bug Fixes

* **serve:** allow saving a project reference to restart server ([93f4dd5](https://github.com/tamj0rd2/ncdc/commit/93f4dd5759af9fe146dd3f3421ec72b5c916396f)), closes [#382](https://github.com/tamj0rd2/ncdc/issues/382)

# [0.13.0](https://github.com/tamj0rd2/ncdc/compare/v0.12.0...v0.13.0) (2020-08-18)


### Features

* **serve mode:** watch changes to project references and do initial solution build ([2eca932](https://github.com/tamj0rd2/ncdc/commit/2eca932984cc110a6cf259e71b4f876f2c4041a5)), closes [#241](https://github.com/tamj0rd2/ncdc/issues/241)

# [0.12.0](https://github.com/tamj0rd2/ncdc/compare/v0.11.0...v0.12.0) (2020-07-30)


### Features

* **ts compilation:** improve support for incremental and composite projects ([aac45a3](https://github.com/tamj0rd2/ncdc/commit/aac45a3d3ce75779bf4951aa7ed566bb27f0ab33)), closes [#337](https://github.com/tamj0rd2/ncdc/issues/337)

# [0.11.0](https://github.com/tamj0rd2/ncdc/compare/v0.10.1...v0.11.0) (2020-07-22)


### Bug Fixes

* show better message when object expected but got array ([f72814e](https://github.com/tamj0rd2/ncdc/commit/f72814e2a6465f3a6af36ce483c5166672987a37)), closes [#340](https://github.com/tamj0rd2/ncdc/issues/340)


### Features

* show typescript diagnostics as verbose logs ([cc0ea22](https://github.com/tamj0rd2/ncdc/commit/cc0ea22781c1bf114618bbdbd0a4ae053049f2f6)), closes [#264](https://github.com/tamj0rd2/ncdc/issues/264)

## [0.10.1](https://github.com/tamj0rd2/ncdc/compare/v0.10.0...v0.10.1) (2020-07-06)


### Bug Fixes

* **generator:** fix failure when typescript composite flag is true ([90b6a93](https://github.com/tamj0rd2/ncdc/commit/90b6a939b32e07baf04a3fff85fc8ee6246cd2f3)), closes [#313](https://github.com/tamj0rd2/ncdc/issues/313)

# [0.10.0](https://github.com/tamj0rd2/ncdc/compare/v0.9.0...v0.10.0) (2020-06-21)


### Features

* **test mode:** add an optional --rateLimit flag ([3559d44](https://github.com/tamj0rd2/ncdc/commit/3559d449b3c396de31e33e4bc1e6385b3b93baba)), closes [#268](https://github.com/tamj0rd2/ncdc/issues/268)

# [0.9.0](https://github.com/tamj0rd2/ncdc/compare/v0.8.0...v0.9.0) (2020-06-14)


### Features

* show the invalid value when enum validation fails ([008a9eb](https://github.com/tamj0rd2/ncdc/commit/008a9eb0190bdd6bc5be0190191ce4378c03e67b)), closes [#261](https://github.com/tamj0rd2/ncdc/issues/261)

# [0.9.0-dev.1](https://github.com/tamj0rd2/ncdc/compare/v0.8.0...v0.9.0-dev.1) (2020-06-14)


### Features

* show the invalid value when enum validation fails ([71a89a4](https://github.com/tamj0rd2/ncdc/commit/71a89a4f8479e652eaf8f9b2e9b8097d9a7181d5)), closes [#261](https://github.com/tamj0rd2/ncdc/issues/261)

# [0.8.0](https://github.com/tamj0rd2/ncdc/compare/v0.7.0...v0.8.0) (2020-06-04)


### Features

* **test:** add a timeout flag to timeout response to real api ([a2dbfae](https://github.com/tamj0rd2/ncdc/commit/a2dbfae803b5ede94ca994d3db5376da16f325aa)), closes [#218](https://github.com/tamj0rd2/ncdc/issues/218)

# [0.7.0](https://github.com/tamj0rd2/ncdc/compare/v0.6.0...v0.7.0) (2020-06-04)


### Bug Fixes

* **test:** validate the request body if a request type is given ([a79fafc](https://github.com/tamj0rd2/ncdc/commit/a79fafca34e353ac1b91b41678ffaa9ca71e6d3b)), closes [#246](https://github.com/tamj0rd2/ncdc/issues/246)


### Features

* add a verbose flag to the test and generate commands ([55b2ad4](https://github.com/tamj0rd2/ncdc/commit/55b2ad4a6714d9c7a808979f897c1d98e6c9548e)), closes [#182](https://github.com/tamj0rd2/ncdc/issues/182)


### Performance Improvements

* **generate:** load and write schemas to disk asynchronously ([2172ba0](https://github.com/tamj0rd2/ncdc/commit/2172ba0f75d27e8502d15c01622f37fa6a6a7e2c)), closes [#236](https://github.com/tamj0rd2/ncdc/issues/236)

# [0.6.0](https://github.com/tamj0rd2/ncdc/compare/v0.5.1...v0.6.0) (2020-05-28)


### Features

* **generate:** allow generating types for multiple configs at a time ([93ed23b](https://github.com/tamj0rd2/ncdc/commit/93ed23b6d529b0a7bdfa998bb0c86fa6aad0226f)), closes [#231](https://github.com/tamj0rd2/ncdc/issues/231)

## [0.5.1](https://github.com/tamj0rd2/ncdc/compare/v0.5.0...v0.5.1) (2020-05-28)


### Bug Fixes

* **generate:** do not fail if there are no types in the config ([43b38e2](https://github.com/tamj0rd2/ncdc/commit/43b38e2f2dd6a20cb977d4ea50ce7f1247e28391)), closes [#227](https://github.com/tamj0rd2/ncdc/issues/227)

# [0.5.0](https://github.com/tamj0rd2/ncdc/compare/v0.4.4...v0.5.0) (2020-05-28)


### Features

* **generate:** improve metrics around schema generation ([f3f358d](https://github.com/tamj0rd2/ncdc/commit/f3f358d95da0b006e076ea6eba180f4d1d4133c2)), closes [#229](https://github.com/tamj0rd2/ncdc/issues/229)

## [0.4.4](https://github.com/tamj0rd2/ncdc/compare/v0.4.3...v0.4.4) (2020-05-26)


### Bug Fixes

* **serve:** fix wildcard queries false positives ([09b8694](https://github.com/tamj0rd2/ncdc/commit/09b86945f13ac9cf4be0d9968aa6c5e6f307e6c7)), closes [#211](https://github.com/tamj0rd2/ncdc/issues/211)

## [0.4.3](https://github.com/tamj0rd2/ncdc/compare/v0.4.2...v0.4.3) (2020-05-16)


### Bug Fixes

* **serve:** validate request bodies in serve mode ([d2ac0b1](https://github.com/tamj0rd2/ncdc/commit/d2ac0b1a93552e5dac9c367340c6bccffd7dabc0)), closes [#5](https://github.com/tamj0rd2/ncdc/issues/5)

## [0.4.2](https://github.com/tamj0rd2/ncdc/compare/v0.4.1...v0.4.2) (2020-05-16)


### Bug Fixes

* **serve:** fix a small bug in request header validation ([92dfa3f](https://github.com/tamj0rd2/ncdc/commit/92dfa3f9887185386a0238c32f55651ea90ea21d))

## [0.4.1](https://github.com/tamj0rd2/ncdc/compare/v0.4.0...v0.4.1) (2020-05-16)


### Bug Fixes

* **serve:** validating incoming headers in serve mode ([bcfc762](https://github.com/tamj0rd2/ncdc/commit/bcfc7628d0020d824dccdb1c11c218b6c233ee4f)), closes [#4](https://github.com/tamj0rd2/ncdc/issues/4)

# [0.4.0](https://github.com/tamj0rd2/ncdc/compare/v0.3.2...v0.4.0) (2020-05-14)


### Features

* support using non-json fixtures ([aebf58f](https://github.com/tamj0rd2/ncdc/commit/aebf58f58967e205f982d813b50f23411fe32a00)), closes [#44](https://github.com/tamj0rd2/ncdc/issues/44)

## [0.3.2](https://github.com/tamj0rd2/ncdc/compare/v0.3.1...v0.3.2) (2020-05-11)


### Bug Fixes

* fix a bad import ([370fb68](https://github.com/tamj0rd2/ncdc/commit/370fb686f820ca00c73b9cfe6467a3ec36a64df8)), closes [#157](https://github.com/tamj0rd2/ncdc/issues/157)

## [0.3.1](https://github.com/tamj0rd2/ncdc/compare/v0.3.0...v0.3.1) (2020-05-11)


### Bug Fixes

* **serve:** make typescript a dependency ([55f3a9e](https://github.com/tamj0rd2/ncdc/commit/55f3a9e80ac1d50dffa73a3b893862ceacb277f0)), closes [#157](https://github.com/tamj0rd2/ncdc/issues/157)

# [0.3.0](https://github.com/tamj0rd2/ncdc/compare/v0.2.6...v0.3.0) (2020-05-10)


### Features

* **serve:** watch source types for changes in serve mode ([236a660](https://github.com/tamj0rd2/ncdc/commit/236a660eb6f709d11d5b78ebe3991230b4a45b49)), closes [#144](https://github.com/tamj0rd2/ncdc/issues/144)

## [0.2.6](https://github.com/tamj0rd2/ncdc/compare/v0.2.5...v0.2.6) (2020-05-08)


### Bug Fixes

* **generate:** fix generate mode not accepting valid cofig options ([40cc6b7](https://github.com/tamj0rd2/ncdc/commit/40cc6b7296b39b0404626b034f9ad51cf614ba6d)), closes [#150](https://github.com/tamj0rd2/ncdc/issues/150)

## [0.2.5](https://github.com/tamj0rd2/ncdc/compare/v0.2.4...v0.2.5) (2020-05-08)


### Bug Fixes

* **test:** fix a bug with response content negotiation ([1ab044e](https://github.com/tamj0rd2/ncdc/commit/1ab044eca2981a8300832bc67e87770dcb40c801)), closes [#143](https://github.com/tamj0rd2/ncdc/issues/143)
