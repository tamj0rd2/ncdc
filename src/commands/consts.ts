export const CONFIG_PATH = 'configPath'
export const CONFIG_PATH_DESCRIBE = 'path to the ncdc config file'
export const CONFIG_PATH_TYPE = 'string'

export const TSCONFIG_PATH = 'tsconfigPath'
export const TSCONFIG_ALIAS = 'c'
export const TSCONFIG_DESCRIPTION =
  'a path to the tsconfig file which contains the types specified in the given config file'
export const TSCONFIG_DEFAULT = './tsconfig.json'
export const TSCONFIG_TYPE = 'string'

export const SCHEMA_PATH = 'schemaPath'
export const SCHEMA_PATH_TYPE = 'string'
export const SCHEMA_PATH_DESCRIPTION =
  'specify a path to load json schemas from, rather than generating schmas for types specified in ncdc config at runtime'

export const FORCE_GENERATION = 'force'
export const FORCE_GENERATION_ALIAS = 'f'
export const FORCE_GENERATION_TYPE = 'boolean'
export const FORCE_GENERATION_DEFAULT = false
export const FORCE_GENERATION_DESCRIPTION = 'ignores typescript compiler errors'

export const EXAMPLE_GENERATE_COMMAND = 'ncdc generate ./config.yml'
export const EXAMPLE_GENERATE_DESCRIPTION = 'Generates json schemas for any type specified in config.yml.'

export const EXAMPLE_SERVE_COMMAND = 'ncdc serve ./config.yml 4000'
export const EXAMPLE_SERVE_DESCRIPTION = 'Serves the mock API endpoints defined in config.yml on port 4000.'

export const EXAMPLE_TEST_COMMAND = 'ncdc test ./config.yml https://example.com'
export const EXAMPLE_TEST_DESCRIPTION =
  'Tests that the responses for the API endpoints defined in config.yml match the configured parameters.'
