export type DataObject = { [index: string]: Data }
export type Data = string | number | boolean | DataObject | Data[]
export type SupportedMethod = 'GET' | 'POST'
