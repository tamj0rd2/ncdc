declare type Optional<T> = T | undefined
declare type Public<T> = { [P in keyof T]: T[P] }
declare type PopulatedArray<T> = { 0: T } & Array<T>
