export const CONFIG_PATH = 'configPath'
export const CONFIG_PATH_OPTS = {
  describe: 'path to the ncdc config file',
  type: 'string',
} as const
export const NEW_CONFIG_PATH_OPTS = {
  describe: 'path to the ncdc config file',
  type: 'string',
  default: './ncdc.js',
} as const

export const CONFIG_PATHS = 'configPaths'
export const CONFIG_PATHS_OPTS = {
  ...CONFIG_PATH_OPTS,
  array: true,
} as const

export const TSCONFIG_PATH = 'tsconfigPath'
export const TSCONFIG_PATH_OPTS = {
  alias: ['c', 'p'],
  type: 'string',
  default: './tsconfig.json',
  describe: 'a path to the tsconfig file which contains the types specified in the given config file',
} as const

export const SCHEMA_PATH = 'schemaPath'
export const SCHEMA_PATH_OPTS = {
  type: 'string',
  describe:
    'specify a path to load json schemas from, rather than generating schmas for types specified in ncdc config at runtime',
} as const

export const FORCE_GENERATION = 'force'
export const FORCE_GENERATION_OPTS = {
  alias: 'f',
  type: 'boolean',
  default: false,
  describe: 'ignores typescript compiler errors',
} as const

export const VERBOSE = 'verbose'
export const VERBOSE_OPTS = {
  alias: 'v',
  type: 'boolean',
  default: false,
  describe: 'enables output of verbose logging information',
} as const

export const EXAMPLE_GENERATE_COMMAND = 'ncdc generate ./config.yml'
export const EXAMPLE_GENERATE_DESCRIPTION = 'Generates json schemas for any type specified in config.yml.'

export const EXAMPLE_SERVE_COMMAND = 'ncdc serve ./config.yml 4000'
export const EXAMPLE_SERVE_DESCRIPTION = 'Serves the mock API endpoints defined in config.yml on port 4000.'

export const EXAMPLE_TEST_COMMAND = 'ncdc test ./config.yml https://example.com'
export const EXAMPLE_TEST_DESCRIPTION =
  'Tests that the responses for the API endpoints defined in config.yml match the configured parameters.'
