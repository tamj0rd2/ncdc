<img align="right" alt="Ajv logo" width="160" src="./icon.png">


# NCDC

NCDC (or node cdc) is a tool that takes a consumer contract (written in yaml)
and tests the specified endpoints against a producer. You can also run a single
command to mock those endpoints.

The point of using this tool is to ensure that each endpoint you use in
development is called in the same way and responds in the same way as the
endpoints in your live environment. There's not much point in testing against
mock APIs that don't strongly resemble your live APIs.

## Installation

`npm install ncdc --save-dev` or `yarn add ncdc -D`

## Getting started

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

You can find more information about writing configs [here](#config-files)

### Generating JSON schemas

`npx ncdc generate ./config.yml --output ./schemas`

This will create JSON schemas for any request and response types specified in
your cnofig file. `string`, `number`, `boolean` and `object` are internally
recognised, so schemas will not be generated for them.

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
  ncdc generate ./config.yml                Generates json schemas for any Type
                                            specified in config.yml
  ncdc serve ./config.yml 4000              Serves the mock API endpoints
                                            defined in config.yml on port 4000
  ncdc test ./config.yml                    Tests that the responses for the API
  https://mysite.com                        endpoints defined in config.yml
                                            match the configured parameters
```

## Modes

### Generate

#### CLI Usage
```
$ npx ncdc generate --help
ncdc generate &lt;configPath&gt;

Generates a json schema for each type specified in the config file

Positionals:
  configPath  path to the mock config                        [string] [required]

Options:
  --version                   Show version number                      [boolean]
  --help                      Show help                                [boolean]
  --tsconfigPath, -c          a path to the tsconfig which contains required
                              symbols      [string] [default: "./tsconfig.json"]
  --outputPath, -o, --output  sets an output folder for the json schemas
                                             [string] [default: "./json-schema"]
```

### Test

#### CLI Usage
```
$ ./bin/ncdc test --help
ncdc test &lt;configPath&gt; &lt;baseURL&gt;

Tests configured endpoints

Positionals:
  configPath  path to the mock config                        [string] [required]
  baseURL     the URL that your endpoints should be accessed through
                                                             [string] [required]

Options:
  --version           Show version number                              [boolean]
  --help              Show help                                        [boolean]
  --allErrors, -a     show all validation errors per test instead of failing
                      fast                            [boolean] [default: false]
  --schemaPath        specify a path to load json schemas from, rather than
                      generating them                                   [string]
  --tsconfigPath, -c  a path to the tsconfig which contains required symbols
                                           [string] [default: "./tsconfig.json"]
```

### Serve

#### CLI Usage
```
$ ./bin/ncdc serve --help
ncdc serve &lt;configPath&gt; [port]

Serves configured endpoints

Positionals:
  configPath  path to the mock config                        [string] [required]
  port        port to serve the API on                  [number] [default: 4000]

Options:
  --version           Show version number                              [boolean]
  --help              Show help                                        [boolean]
  --allErrors, -a     show all validation errors per test instead of failing
                      fast                            [boolean] [default: false]
  --schemaPath        specify a path to load json schemas from, rather than
                      generating them                                   [string]
  --tsconfigPath, -c  a path to the tsconfig which contains required symbols
                                           [string] [default: "./tsconfig.json"]
```

## Config file

The config file must be a yaml document containing a list of configs. Here are
the allowed properties for each config:

### name

- **Description**: An identifier for the configuration
- **Type**: string
- **Required?**: Yes
- **Example**: `name: My First Config`

### serveOnly

- **Description**: Indicates that this configuration should not be tested, only
  served
- **Type**: boolean
- **Default value**: false
- **Required?**: No
- **Example**: `serveOnly: true`

### request

- **Description**: Contains configuration options for the request
- **Type**: object
- **Required?**: Yes

<!-- TODO: make the query string stuff work as described -->
#### request.endpoints

- **Description**: A single endpoint or list of endpoints that you'd like to
  test or serve.
  
  In Serve mode, if your configured endpoints contain
  query strings, the responses will only be served if there are matching query
  strings present.
- **Type**: string or string[]
- **Required?**: Required in Test mode if serveOnly is false
- **Example**: `endpoints: /my/endpoint` or...
  ```
  endpoints:
    - /books/1
    - /books/2
  ```

#### request.serveEndpoint

- **Description**: An endpoint to serve the corresponding response. This
  supports string patterns ([read more](https://expressjs.com/en/guide/routing.html#route-paths)).
  Regex is not yet supported. This property is ignored in Test mode and overrides
  `request.endpoints` when in Serve mode.
- **Type**: string
- **Required?**: Required in Serve mode if `request.endpoints` is not provided
- **Example**: `serveEndpoint: /api/books/*`


<!-- TODO: Add support for other HTTP methods -->
#### request.method

- **Description**: The HTTP method you would call the endpoint/s with. Currentyly,
  only `GET` and `POST` are supported
- **Type**: string
- **Required?**: Yes
- **Example**: `method: GET`

<!-- TODO: make sure the type actually works like this and gives back a useful error message -->
#### request.type

- **Description**: The name of a typescript symbol or a JSON schema file
  (excluding the .json). JSON schema files will only be used if the `--schemPath`
  flag is used while calling `ncdc test` or `ncdc serve`.
  
  In Test mode, if `request.body` or `request.bodyPath` are specified along with
  a type, validation will be done between the type and the mock request body. If
  validation fails, you will receive an error and the tests will not run.
  
  In Serve mode, if `body`, `bodyPath`, `serveBody` or `serveBodyPath` are
  specified along with a type, validation will be done between the type and the
  request body. If the request body is invalid, the mock response body for this
  configuration will not be served. If there are no other matching endpoints
  found, it will result in a 400 error.

- **Type**: string
- **Required?**: No
- **Example**: `type: SomeInterfaceName`

<!-- TODO: make this work in the way specified. Decided what error should ocurr in the response -->

#### request.headers

- **Description**: The headers you expect to call the endpoint with. Header
  names are case insensitive.

  In Test mode, if the expected headers aren't present or there is a mismatch,
  the test will fail. In Serve mode, the response will not be served.

- **Type**: object
- **Required?**: No
- **Example**:
  ```yaml
  headers:
    content-type: application/json
    Cache-Control: no-cache
  ```

#### request.body

- **Description**: The body you expect to make requests to the endpoint with.
  Cannot be specified at the same time as `request.bodyPath`
- **Type**: string, number, boolean, object or array
- **Required?**: No
- **Example**: `body: { hello: 'world' }`


<!-- TODO/FIXME - logic to get this feature working fully needs to be amended -->
#### request.bodyPath

- **Description**: A path to the body you expect to make requests to the endpoint
  with. It must be a JSON file (should be updated to support other files in the
  future). Cannot be specified at the same time as `request.body`. Relative
  paths should be relative to the config file's location
- **Type**: string
- **Required?**: No
- **Example**: `bodyPath: ./my-response.json` or `bodyPath: /some/absolute/path`

### response

- **Description**: Contains configuration options for the response
- **Type**: object
- **Required?**: Yes

<!-- TODO: Read all of this over from here. -->
#### response.code

- **Description**: The response code you expect the endpoint to respond with
- **Type**: number
- **Required?**: Yes
- **Example**: `code: 404`

#### response.headers

- **Description**: The headers you expect to receive from the endpoint. Header
  names are case insensitive
- **Type**: object
- **Required?**: No
- **Example**:
  ```yaml
  headers:
    content-type: application/json
    Cache-Control: no-cache
  ```

#### response.type

- **Description**: The name of a typescript symbol or a JSON schema file
  (excluding the .json). In Test mode, validation will be done between the actual
  response and the type. The test will fail if the body does not match the schema.
  In Serve mode, if `body`, `bodyPath`, `serveBody` or `serveBodyPath` are
  specified, validation will be done between the type and the mock response. If
  validation fails, you will receive an error and the mocks will not be served.
- **Type**: string
- **Required?**: No
- **Example**: `type: SomeInterfaceName`

#### response.body

- **Description**: The body you expect the endpoint to respond with. Cannot be
  specified at the same time as `response.bodyPath`
- **Type**: string, number, boolean, object or array
- **Required?**: No
- **Example**: `body: Hello world!`


#### response.bodyPath

- **Description**: A path to the body you expect the endpoint to respond with.
  It must be a JSON file (should be updated to support other files in the future).
  Cannot be specified at the same time as `request.body`. Relative paths should
  be relative to the config file's location
- **Type**: string
- **Required?**: No
- **Example**: `bodyPath: ./my-response.json` or `bodyPath: /some/absolute/path`



#### response.serveBody

- **Description**: The body you expect the endpoint to respond with. Cannot be
  specified at the same time as `response.body`, `respond.bodyPath` or
  `response.serveBodyPath`. This property will be ignored in Test mode.
- **Type**: string, number, boolean, object or array
- **Required?**: No
- **Example**: `serveBody: Hello world!`


#### response.serveBodyPath

- **Description**: A path to the body you expect the endpoint to respond with.
  It must be a JSON file (should be updated to support other files in the future).
  Cannot be specified at the same time as `request.body`, `request.bodyPath` or
  `request.serveBody`. Relative paths should be relative to the config file
  location. This property will be ignored in Test mode
- **Type**: string
- **Required?**: No
- **Example**: `serveBodyPath: ./my-response.json` or `serveBodyPath: /some/absolute/path`
