# ncdc

Node cdc is a tool that takes a consumer contract (written in yaml) and tests
it against a producer

## Installation

`npm install ncdc --save-dev` or `yarn add ncdc -D`

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

All help commands:

```
$ ncdc --help
$ ncdc test --help
$ ncdc serve --help
$ ncdc generate --help
```

## Config file

| Property                | Description                                                                                                                                                                                                                                                            | Type                       | Default | Required?                                                        | Example                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `name`                  | An identifier for the configuration                                                                                                                                                                                                                                    | string                     |         | Always                                                           | `name: My First Test`                                                              |
| `serveOnly`             | Indicates that this configuration should not be tested, only served                                                                                                                                                                                                    | true                       | false   | Never                                                            | `serveOnly: true`                                                                  |
| `request`               | Contains configuration options for the request                                                                                                                                                                                                                         | object                     |         | Always                                                           | `request: {}`                                                                      |
| `request.endpoints`     | A single endpoint or list of endpoints that can serve the corresponding response                                                                                                                                                                                       | string or array of strings |         | Required in Test mode when `serveOnly` is `false`                | `endpoints: /my/endpoint`<br>or...<br>`endpoints:`<br>`- /books/1`<br>`- /books/2` |
| `request.serveEndpoint` | An endpoint to serve the corresponding response.<br>This support strings patterns ([read more](https://expressjs.com/en/guide/routing.html#route-paths)).<br>This property is ignored in Test mode.<br>This property overrides `request.endpoints` when in Serve mode. | string                     |         | Required in Serve mode when `request.endpoints` is not specified | `serveEndpoint: /books/*`                                                          |
| `request.method`        | The HTTP method you would call the request endpoint/s with                                                                                                                                                                                                             | string                     |         | Always                                                           | `method: POST`                                                                     |
| `request.type`          | The name of a typescript type/interface or a JSON schema file (excluding the .json)                                                                                                                                                                                    |                            |         |                                                                  |                                                                                    |
| `request.body`          |                                                                                                                                                                                                                                                                        |                            |         |                                                                  |                                                                                    |
| `request.bodyPath`      |                                                                                                                                                                                                                                                                        |                            |         |                                                                  |                                                                                    |
| `request.serveBody`     |                                                                                                                                                                                                                                                                        |                            |         |                                                                  |                                                                                    |
| `request.serveBodyPath` |                                                                                                                                                                                                                                                                        |                            |         |                                                                  |                                                                                    |
| `request.headers`       |                                                                                                                                                                                                                                                                        | object                     |         |                                                                  |                                                                                    |
