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
