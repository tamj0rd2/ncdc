export interface SchemaRetriever {
  load: (symbolName: string) => Promise<object>
}
