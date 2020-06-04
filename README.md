<a href="#readme"><img align="right" alt="Ajv logo" width="160" src="./icon.png"/></a>

# NCDC

[![Build Status](https://travis-ci.com/tamj0rd2/ncdc.svg?branch=master)](https://travis-ci.com/tamj0rd2/ncdc)
[![npm version](https://badge.fury.io/js/ncdc.svg)](https://badge.fury.io/js/ncdc)
[![codecov](https://codecov.io/gh/tamj0rd2/ncdc/branch/master/graph/badge.svg)](https://codecov.io/gh/tamj0rd2/ncdc)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Dependabot Status](https://api.dependabot.com/badges/status?host=github&repo=tamj0rd2/ncdc)](https://dependabot.com)

NCDC (or node cdc) is a tool that takes a consumer contract (written in yaml)
and tests the specified endpoints against a producer. You can also run a single
command to mock those endpoints.

The point of using this tool is to ensure that each endpoint you use in
development is called in the same way and responds in the same way as the
endpoints in your live environment. There's not much point in testing against
mock APIs that don't strongly resemble your live APIs.

This tool can easily integrate with typescript to prevent you from having to
write JSON schemas for your already defined Typescript interfaces, types and
enums. With this, you're guaranteed that your code, mock API endpoints and
real endpoints are all consistent with eachother.

## Contents

- [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Example config](#example-config.yml)
  - [Serving mocks](#serving-mocks-using-the-config-file)
  - [Running tests](#testing-real-endpoints-against-the-config)
  - [Generating JSON schemas](#generating-json-schemas)
- [CLI Usage](#cli-usage)
  - [Serve mode](#serve)
    - [Local development recipes](#local-development-recipes)
  - [Test mode](#test)
  - [Generate](#generate)
- [Response content negotiation](#response-content-negotiation)
- [Docker use case](#docker-use-case)

## Getting started

### Installation

`npm install ncdc --save-dev` or `yarn add ncdc -D`

### Example config.yml

The below `config.yml` file contains 2 configurations

```yaml
- name: Book not found
  serveOnly: true
  request:
    method: GET
    endpoints: /api/books/a-bad-id
  response:
    code: 404

- name: Book
  request:
    method: GET
    endpoints:
      - /api/books/123
      - /api/books/456
    serveEndpoint: /api/books/*
  response:
    code: 200
    headers:
      content-type: application/json
    type: Book
    serveBody:
      {
        ISBN: "9780141187761",
        ISBN_13: 978-0141187761,
        author: George Orwell,
        title: 1984 Nineteen Eighty-Four,
        inventoryId: item-87623
      }
```

config.yml references the type `Book` which is exported from `mySourceFile.ts`:

```typescript
export interface Book {
  ISBN: string
  ISBN_13: string
  author: string
  title: string
  // You can set extra json schema properties via JSDoc comments
  /** @pattern ^item- */
  inventoryId: string
}
```

====> **You can find more information about writing your config file
[HERE](./docs/CONFIG.md#config), as well how all of the options behave** <====

### Serving mocks using the config file

`npx ncdc serve ./config.yml 3000`

This will serve each configuration on `http://localhost:3000`.

When GET requests are sent to `/api/books/a-bad-id`, ncdc will respond with a
404 status code.

When GET requests are sent to `/api/books/123` or `/api/books/456`, ncdc will
respond with the following:

- Status code as 200
- content-type header as application/json
- a JSON body with the value of `serveBody`

You can find more information about serve mode [here](#serve)

### Testing real endpoints against the config

`npx ncdc test ./config.yml https://example.com`

This will run tests for each configuration except those with `serveOnly` set to
true. For this reason, the `Book not found` configuration will not be tested
against the real API.

For the `Book` configuration, ncdc will make GET requests to
https://example.com/api/books/123 and https://example.com/api/books/456 and
verify that both responses meet these requirements:

- It responds with a 200 status code
- It responds with the content-type header set to application/json
- The response body is JSON containing at least:
  - property `ISBN` with a string value
  - property `ISBN_13` with a string value
  - property `author` with a string value
  - property `title` with a string value
  - property `inventoryId` with a string value starting with `item-`

You can find more information about test mode [here](#test)

### Generating JSON schemas

`npx ncdc generate ./config.yml --output ./schemas`

This will write JSON schemas to disk for each of the types you reference in your
config.yml, such as `Book` in the above example. This can be useful for caching
purposes.

You can find more information about generating schemas and why you might want to
do that [here](#generate)

## CLI usage

```
$ npx ncdc --help
ncdc <command>

Commands:
  ncdc generate <configPath>        Generates a json schema for each type
                                    specified in the config file
  ncdc serve <configPath> [port]    Serves configured endpoints
  ncdc test <configPath> <baseURL>  Tests configured endpoints

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]

Examples:
  ncdc generate ./config.yml                Generates json schemas for any type
                                            specified in config.yml.
  ncdc serve ./config.yml 4000              Serves the mock API endpoints
                                            defined in config.yml on port 4000.
  ncdc test ./config.yml                    Tests that the responses for the API
  https://example.com                       endpoints defined in config.yml
                                            match the configured parameters.
```

You can use the `-f` or `--force` flag to skip typechecking your source files.
This speeds up the generate command, however, you should still use another tool
e.g `tsc` to typecheck your project. If you try to use broken types with ncdc,
ncdc will probably behave unexpectedly.

### Serve

Serves mock API endpoints defined in config.yml

#### CLI Usage

Run `npx ncdc serve --help` to get contextual usage information and examples for
this command.

#### How it works

When ncdc receives a request, it will go through each configuration in your
config.yml (from top to bottom) and serve the first one that meets all of your
request constraints. If the request does not match any of your configurations,
ncdc will response with a 404.

#### Local development recipes

How to run your fake APIs locally:

`package.json`

```jsonc
  "scripts": {
    // dev script before adding ncdc
    "dev": "nodemon --watch 'src/**/*.ts' --exec 'ts-node' src/index.ts",
    // scripts after adding ncdc
    "devServer": "nodemon --watch 'src/**/*.ts' --exec 'ts-node' src/index.ts",
    "bookService": "ncdc serve ./book-service.yml 4000",
    "filmService": "ncdc serve ./film-service.yml 4001",
    // concurrently is optional, you could just run each npm script in separate shells
    "dev": "concurrently --kill-others-on-fail 'npm:bookService' 'npm:filmService' 'npm:devServer'",
  }
```

### Test

Tests that responses from a real API match the configured parameters in config.yml

#### CLI Usage

Run `npx ncdc test --help` to get contextual usage information and examples for
this command.

### Generate

Generates json schemas for any type specified in config.yml

#### CLI Usage

Run `npx ncdc generate --help` to get contextual usage information and examples
for this command.

#### How it works

This will create JSON schemas for your types and save them to disk. They can
later be used with the serve and test commands, rather than re-generating them
on the fly.

The reasons why you might want to do this are described in the
[Docker use case](#docker-use-case)

## Response content negotiation

![alt text](./docs/content-negotiation.png "Title")

## Docker use case

### A potential timing issue

Behind the scenes, ncdc makes use of the typescript compiler to create json
schemas for each of the types referenced in your config.yml. Those schemas are
then used for validation during serve mode and test mode.

Due to the use of the typescript compiler, the `serve` and `test` commands
can often take a few seconds to start. The exact amount of time it takes depends
on the size and configuration of your typescript project.

So, when can this become an issue? Here's a real use case. Let's say I have 2
docker-compose services:

```yaml
services:
  # serves some API endpoints using ncdc
  fake-book-service:
    build: .
    command: npx ncdc serve path-to-config.yml 4000
  
  # runs some integration tests that need a book service to be available
  integration-tests:
    build: .
    command: npx jest
    depends_on:
      - fake-book-service
    environment:
      - BOOK_SERVICE_URL=http://fake-book-service:4000
```

The docker-compose `depends_on` property is only responsible for starting a
docker service. It doesn't do any health checks that guarantee fake-book-service
is up and serving requests. That means it's possbile for the integration
tests to run before the API is ready, which would result in some (if not all)
of the integration tests failing. That's where caching and the generate command
become useful. 

### How to fix it

#### Solution 1

Adding the below line to the `Dockerfile` will generate the json scheams during
the docker build.

```Dockerfile
RUN npx ncdc generate path-to-config.yml --output ./json-schema
```

Then the command for the `fake-book-service` can be changed to the following,
which will skip schema generation and instead use the schemas that were produced
during the docker build.

```yaml
fake-book-service:
  build: .
  command: npx ncdc serve path-to-config.yml --schemaPath ./json-schema
```

This should speed up the start of the `fake-book-service` enough that the fake
endpoints will be ready to use in the integration tests.

#### Solution 2

You can also use a [wait-for](https://github.com/eficode/wait-for) script as an
extra measure, which can be used in addition to Solution 1. This would be used
like so:

```yaml
integration-tests:
    build: .
    command: ./wait-for.sh fake-book-service:4000 -- npx jest
    depends_on:
      - fake-book-service
    environment:
      - BOOK_SERVICE_URL=http://fake-book-service:4000
    volumes:
      # the mapping of this volume depends on your own file structure
      - ./wait-for.sh:/usr/src/wait-for.sh
```
