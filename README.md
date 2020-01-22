<a href="#readme"><img align="right" alt="Ajv logo" width="160" src="./icon.png"/></a>

# NCDC

[![Build Status](https://travis-ci.com/tamj0rd2/ncdc.svg?branch=rewrite)](https://travis-ci.com/tamj0rd2/ncdc)
[![npm version](https://badge.fury.io/js/ncdc.svg)](https://badge.fury.io/js/ncdc)
[![codecov](https://codecov.io/gh/tamj0rd2/ncdc/branch/rewrite/graph/badge.svg)](https://codecov.io/gh/tamj0rd2/ncdc)

NCDC (or node cdc) is a tool that takes a consumer contract (written in yaml)
and tests the specified endpoints against a producer. You can also run a single
command to mock those endpoints.

The point of using this tool is to ensure that each endpoint you use in
development is called in the same way and responds in the same way as the
endpoints in your live environment. There's not much point in testing against
mock APIs that don't strongly resemble your live APIs.

This tool can easily integrate with typescript to prevent you from having to
write JSON schemas for your already defined Typescript interfaces, types and
enums.

<!-- TODO: add an examples folder with working examples -->

## Contents

- [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Example config](#example-config)
  - [Generating JSON schemas](#generating-json-schemas)
  - [Running tests](#running-tests)
  - [Serving mocks](#serving-mocks)
- [CLI Usage](#cli-usage)
- [Generate command](#generate)
- [Test command](#test)
- [Serve command](#serve)

## Getting started

### Installation

`npm install ncdc --save-dev` or `yarn add ncdc -D`

### Example config

config.yml:

```yaml
- name: Books
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
    type: object
    serveBody:
      {
        ISBN: "9780141187761",
        ISBN_13: 978-0141187761,
        author: George Orwell,
        title: 1984 Nineteen Eighty-Four,
      }
```

This configuration file contains a single config with the name Books.

You can find more information about writing configurations [here](./CONFIG.md#config)

### Generating JSON schemas

`npx ncdc generate ./config.yml --output ./schemas`

This will create JSON schemas for any request and response types specified in
your cnofig file. `string`, `number`, `boolean` and `object` are internally
recognised, so schemas will not be generated for them.

<!-- TODO: add some info as to why someone might want to do this and how to 
utilize is in test/serve mode -->
Generating schemas is optional but can be useful for caching purposes.

You can find more information about generating schemas [here](#generate)

### Running tests

`npx ncdc test ./config.yml https://example.com`

This will run tests for each configuration. In this case, it will run a separate
test for each specified endpoint. It will make sure that GET requests to
https://example.com/api/books/123 and https://example.com/api/books/456 both
meet these requirements:

- It responds with a 200 status code
- It responds with the content-type header set to application/json
- The response body is an object

You can find more information about test mode [here](#test)

### Serving mocks

`npx ncdc serve ./config.yml 3000`

This will serve each configured endpoint on port 3000. As `serveEndpoint` is set
to `/api/books/*`, any requests starting with
`localhost:3000/api/books/<anything>` will respond with the following:

- Status code as 200
- content-type header as application/json
- body as the value of `serveBody`

You can find more information about serve mode [here](#serve)

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

## Generate

### CLI Usage

Run `npx ncdc generate --help` to get contextual usage information and examples
for this command.

## Test

### CLI Usage

Run `npx ncdc test --help` to get contextual usage information and examples for
this command.

## Serve

### CLI Usage

Run `npx ncdc serve --help` to get contextual usage information and examples for
this command.
