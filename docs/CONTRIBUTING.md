# Contributing

## Raising issues/getting help

- Use the `Bug template` for bugs
- Use the `Feature template` for feature requests/behaviour changes/suggestions
- For questions or anything else, create an issue as normal

## Development

1. Clone the repo
2. `npm install`
3. Open a second terminal and run `npm run compile -- -w` in the background. This
is necessary to run the acceptance tests

### Running the tests

- `npm run test:watch` to run tests in watch mode during development
- `npm run test:unit` to run unit tests only
- `npm run test:integration` to run integration tests only
- `npm run test:acceptance` to run acceptance tests only

### Running the tests in docker

You may want to run the tests in a docker container to get around any weird
machine specific issues or bugs.

- `docker-compose up --build unit-tests` to run unit tests only
- `docker-compose up --build integration-tests` to run integration tests only
- `docker-compose up --build acceptance-tests` to run acceptance tests only

### PRs

When you open a PR, tests and coverage checks will be run in a CI pipeline
automatically. Everything needs to pass before it can be merged. I'm happy to
help out with PRs/give guidance.

## Adding support for new versions of typescript:

1. `npm i -D typescript@latest`
2. `npm i -D --prefix ./black-box-tests/pre-release typescript@latest`
3. `npm i ts-json-schema-generator@latest`
4. Make a commit with the title `feat: add support for typescript <version no>`
5. Push to a branch and create a PR

## Releases

A note on releasing - [pre-release branches should be merged with no-ff](https://github.com/semantic-release/git#message)
