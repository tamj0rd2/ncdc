import ts from 'typescript'
import { resolve, dirname } from 'path'

export function formatErrorDiagnostic(diagnostic: ts.Diagnostic): string {
  return `Error ${diagnostic.code}: ${ts.flattenDiagnosticMessageText(
    diagnostic.messageText,
    ts.sys.newLine,
  )}`
}

export function readTsConfig(path: string): ts.ParsedCommandLine {
  const tsconfigPath = resolve(path)
  const rawConfigFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile)
  if (rawConfigFile.error) throw new Error(formatErrorDiagnostic(rawConfigFile.error))
  if (!rawConfigFile.config) throw new Error('Could not parse the given tsconfig file')

  const configFile = ts.parseJsonConfigFileContent(
    rawConfigFile.config,
    ts.sys,
    dirname(tsconfigPath),
    {},
    tsconfigPath,
  )
  configFile.options.noEmit = !configFile.options.incremental ?? true
  return configFile
}
