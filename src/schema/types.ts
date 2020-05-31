export interface SchemaRetriever {
  init?: () => void
  load: (symbolName: string) => Promise<object>
}
