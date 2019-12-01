export type DataArray = Data[]
export type DataObject = { [index: string]: Data }
export type Data = string | number | boolean | DataObject | DataArray
export type SupportedMethod = 'GET'
