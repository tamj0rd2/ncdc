declare type Optional<T> = T | undefined
declare type Public<T> = { [P in keyof T]: T[P] }
declare type PopulatedArray<T> = { 0: T } & Array<T>
declare type ROPopulatedArray<T> = { 0: T } & ReadonlyArray<T>

declare type DataObject = { [index: string]: Data }
declare type Data = string | number | boolean | DataObject | Data[]
declare type StringDict = Record<string, string>
