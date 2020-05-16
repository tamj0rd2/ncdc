declare type Optional<T> = T | undefined
declare type Public<T> = { [P in keyof T]: T[P] }
declare type PopulatedArray<T> = { 0: T } & Array<T>
declare type ROPopulatedArray<T> = { 0: T } & ReadonlyArray<T>

type DataItem = string | number | boolean | null | DataObject | DataItem[]
type DataObject = { [index: string]: DataItem }
declare type Data = DataObject | DataObject[] | string
declare type NcdcHeaders = Record<string, string>
