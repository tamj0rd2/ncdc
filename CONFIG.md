# Config

The config file must be a yaml document containing a list of configs. This
document describes the allowed properties for each config. If any config option
is invalid, you will receive an error message and the program will terminate.
[Example configuration](./README.md#example-config)

## Contents
- [name](#name)
- [serveOnly](#serveOnly)
- [request](#request)
  - [request.endpoints](#request.endpoints)
  - [request.serveEndpoint](#request.serveEndpoint)
  - [request.method](#request.method)
  - [request.type](#request.type)
  - [request.headers](#request.headers)
  - [request.body](#request.body)
  - [request.bodyPath](#request.bodyPath)
- [response](#response)
  - [response.code](#response.code)
  - [response.headers](#response.headers)
  - [response.type](#response.type)
  - [response.body](#response.body)
  - [response.bodyPath](#response.bodyPath)
  - [response.serveBody](#response.serveBody)
  - [response.serveBodyPath](#response.serveBodyPath)

## name

- **Description**: An identifier for the configuration
- **Type**: string
- **Required?**: Yes
- **Example**: `name: My First Config`

## serveOnly

- **Description**: Indicates that this configuration should not be tested, only
  served
- **Type**: boolean
- **Default value**: false
- **Required?**: No
- **Example**: `serveOnly: true`

## request

- **Description**: Contains configuration options for the request
- **Type**: object
- **Required?**: Yes

<!-- TODO: make the query string stuff work as described -->
### request.endpoints

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

### request.serveEndpoint

- **Description**: An endpoint to serve the corresponding response. This
  supports string patterns ([read more](https://expressjs.com/en/guide/routing.html#route-paths)).
  Regex is not yet supported. This property is ignored in Test mode and overrides
  `request.endpoints` when in Serve mode.
- **Type**: string
- **Required?**: Required in Serve mode if `request.endpoints` is not provided
- **Example**: `serveEndpoint: /api/books/*`


<!-- TODO: Add support for other HTTP methods -->
### request.method

- **Description**: The HTTP method you would call the endpoint/s with. Currentyly,
  only `GET` and `POST` are supported
- **Type**: string
- **Required?**: Yes
- **Example**: `method: GET`

<!-- TODO: make sure the type actually works like this and gives back a useful error message -->
### request.type

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

### request.headers

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

### request.body

- **Description**: The body you expect to make requests to the endpoint with.
  Cannot be specified at the same time as `request.bodyPath`
- **Type**: string, number, boolean, object or array
- **Required?**: No
- **Example**: `body: { hello: 'world' }`


<!-- TODO/FIXME - logic to get this feature working fully needs to be amended -->
### request.bodyPath

- **Description**: A path to the body you expect to make requests to the endpoint
  with. It must be a JSON file (should be updated to support other files in the
  future). Cannot be specified at the same time as `request.body`. Relative
  paths should be relative to the config file's location
- **Type**: string
- **Required?**: No
- **Example**: `bodyPath: ./my-response.json` or `bodyPath: /some/absolute/path`

## response

- **Description**: Contains configuration options for the response
- **Type**: object
- **Required?**: Yes

<!-- TODO: Read all of this over from here. -->
### response.code

- **Description**: The response code you expect the endpoint to respond with
- **Type**: number
- **Required?**: Yes
- **Example**: `code: 404`

### response.headers

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

### response.type

- **Description**: The name of a typescript symbol or a JSON schema file
  (excluding the .json). In Test mode, validation will be done between the actual
  response and the type. The test will fail if the body does not match the schema.
  In Serve mode, if `body`, `bodyPath`, `serveBody` or `serveBodyPath` are
  specified, validation will be done between the type and the mock response. If
  validation fails, you will receive an error and the mocks will not be served.
- **Type**: string
- **Required?**: No
- **Example**: `type: SomeInterfaceName`

### response.body

- **Description**: The body you expect the endpoint to respond with. Cannot be
  specified at the same time as `response.bodyPath`
- **Type**: string, number, boolean, object or array
- **Required?**: No
- **Example**: `body: Hello world!`


### response.bodyPath

- **Description**: A path to the body you expect the endpoint to respond with.
  It must be a JSON file (should be updated to support other files in the future).
  Cannot be specified at the same time as `request.body`. Relative paths should
  be relative to the config file's location
- **Type**: string
- **Required?**: No
- **Example**: `bodyPath: ./my-response.json` or `bodyPath: /some/absolute/path`



### response.serveBody

- **Description**: The body you expect the endpoint to respond with. Cannot be
  specified at the same time as `response.body`, `respond.bodyPath` or
  `response.serveBodyPath`. This property will be ignored in Test mode.
- **Type**: string, number, boolean, object or array
- **Required?**: No
- **Example**: `serveBody: Hello world!`


### response.serveBodyPath

- **Description**: A path to the body you expect the endpoint to respond with.
  It must be a JSON file (should be updated to support other files in the future).
  Cannot be specified at the same time as `request.body`, `request.bodyPath` or
  `request.serveBody`. Relative paths should be relative to the config file
  location. This property will be ignored in Test mode
- **Type**: string
- **Required?**: No
- **Example**: `serveBodyPath: ./my-response.json` or `serveBodyPath: /some/absolute/path`
