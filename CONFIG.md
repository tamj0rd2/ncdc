# Config

The config file must be a yaml document containing a list of configs. This
document describes the allowed properties for each config. If any config option
is invalid, you will receive an error message and the program will terminate.
[Example configuration](./README.md#example-config)

Here's a format that describes each config setting:

- **Description** - a description of the setting
- **Type** - the type the value of the setting needs to have
- **Default** value - the default value for the setting. Omitted if there is no default
- **Required?** - is the setting required?
- **Example** - example of what the config setting would look like in yaml

## Contents
- [name](#name)
- [serveOnly](#serveOnly)
- [request](#request)
  - [request.endpoints](#requestendpoints)
  - [request.serveEndpoint](#requestserveEndpoint)
  - [request.method](#requestmethod)
  - [request.type](#requesttype)
  - [request.headers](#requestheaders)
  - [request.body](#requestbody)
  - [request.bodyPath](#requestbodyPath)
- [response](#response)
  - [response.code](#responsecode)
  - [response.headers](#responseheaders)
  - [response.type](#responsetype)
  - [response.body](#responsebody)
  - [response.bodyPath](#responsebodyPath)
  - [response.serveBody](#responseserveBody)
  - [response.serveBodyPath](#responseserveBodyPath)
<br>


## name

- **Description**: An identifier for the configuration
- **Type**: string
- **Required?**: Yes
- **Example**:
  ```yaml
  name: My First Config
  ```

## serveOnly

- **Description**: Indicates that this configuration should not be tested, only
  served
- **Type**: boolean
- **Default value**: false
- **Required?**: No
- **Example**:
 ```yaml
  serveOnly: true
  ```

## request

- **Description**: Contains configuration options for the request
- **Type**: object
- **Required?**: Yes

### request.endpoints

- **Description**: A single endpoint or list of endpoints that you'd like to
  test or serve.<br>

  In Serve mode, if your configured endpoints contain a query string, responses
  will only be served if your request has matching query params. For example, in
  order to get responses for the configuration `endpoints: /endpoint?size=5&size=6`,
  you would need to make a request that include `size=5` and `size=6` as query
  params. If you leave them out of the request, your response will not be served
  and you'll receive a 400 status code. Providing extra params does not cause
  adverse effects.
- **Type**: string or string[]
- **Required?**: Required in Test mode if serveOnly is false
- **Example**:
  ```yaml
  endpoints: /my/endpoint`
  # Or...
  endpoints:
    - /my/endpoint1
    - /my/endpoint1
  ```

### request.serveEndpoint

- **Description**: An endpoint to serve the corresponding response. This
  supports string patterns ([read more](https://expressjs.com/en/guide/routing.html#route-paths)).
  Regex is not yet supported. This property is ignored in Test mode and overrides
  `request.endpoints` when in Serve mode.
- **Type**: string
- **Required?**: Required in Serve mode if `request.endpoints` is not provided
- **Example**:
  ```yaml
  serveEndpoint: /api/books/*
  ```


<!-- TODO: Add support for other HTTP methods and make this work as described -->
### request.method

- **Description**: The HTTP method you would call the endpoint/s with. Currently,
  only `GET` and `POST` are supported<br>
  In Serve mode, if the endpoint exists but is called with the wrong method, it
  will return a 405 response with an Allow header.
- **Type**: string
- **Required?**: Yes
- **Example**:
  ```yaml
  method: GET
  ```

<!-- TODO: make sure the type actually works like this and gives back a useful error message -->
<!-- TODO: add an option to fail if extra properties are provided  -->
### request.type

- **Description**: The name of a typescript symbol or a JSON schema file
  (excluding the .json). JSON schema files will only be used if the `--schemPath`
  flag is used while calling `ncdc test` or `ncdc serve`.<br>
  In Serve and Test mode, if `request.body` or `request.bodyPath` are specified
  along with a type, validation will be done between the type and the request
  body. If validation fails, you will receive an error and the program will
  terminate. Validation won't fail if extra properties are provided<br>
  In Serve mode, if a type is specified alongside `request.body` or
  `request.bodyPath`, the request body will be matched against the type, not the
  specified body. If the type does not match the request body the endpoint will
  respond with a 400 status code. Just send the problems back in the response.

- **Type**: string
- **Required?**: No
- **Example**:
  ```yaml
  type: SomeInterfaceNam
  ```

<!-- TODO: make this work in the way specified. Decided what error should occur in the response -->

### request.headers

- **Description**: The headers you expect to call the endpoint with. Header
  names are case insensitive.<br>
  In Test mode, if the expected headers aren't present or there is a mismatch,
  the test will fail.<br>
  In Serve mode, the response will not be served.
- **Type**: object
- **Required?**: No
- **Example**:
  ```yaml
  headers:
    content-type: application/json
    Cache-Control: no-cache
  ```

<!-- TODO: make this work as described -->
### request.body

- **Description**: The body you expect to make requests to the endpoint with.
  Cannot be specified at the same time as `request.bodyPath`.
  
  In Serve mode, if this property is specified without `request.type`, responses
  will  only be served if the request body matches `request.body`
- **Type**: string, number, boolean, object or array
- **Required?**: No
- **Example**: `body: { hello: 'world' }`


<!-- TODO/FIXME - logic to get this feature working fully needs to be amended -->
### request.bodyPath

- **Description**: A path to the body you expect to make requests to the endpoint
  with. It must be a JSON file (should be updated to support other files in the
  future). Cannot be specified at the same time as `request.body`. Relative
  paths should be relative to the config file's location
  
  In Serve mode, if this property is specified without `request.type`, responses
  will only be served if the request body matches `request.body`
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
