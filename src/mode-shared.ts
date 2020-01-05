import Problem from './problem'
import chalk from 'chalk'

const groupBy = <T>(items: T[], getKey: (item: T) => string): Map<string, T[]> =>
  items.reduce((map, item) => {
    const key = getKey(item)
    const collection = map.get(key)
    if (collection) {
      collection.push(item)
    } else {
      map.set(key, [item])
    }
    return map
  }, new Map<string, T[]>())

export const logSucess = (displayName: string, prefix = 'PASSED', extra?: string): void => {
  console.log(chalk.green.bold(`${prefix}:`), chalk.green(displayName), extra)
}

export const logFailure = (displayName: string, prefix = 'FAILED', suffix?: string): void => {
  console.error(chalk.red.bold(`${prefix}:`), chalk.red(displayName), suffix)
}

export const logValidationErrors = (problems: Problem[]): void => {
  groupBy(problems, x => x.path).forEach((groupedProblems, dataPath) => {
    groupBy(groupedProblems, x => x.problemType).forEach((groupedByType, type) => {
      groupedByType.forEach(({ message }) => console.log(chalk.blue(`${type} ${dataPath}`), message))
      const { data, schema } = groupedProblems[0]

      console.log(chalk.yellow('Data:'))
      console.dir(data, { depth: dataPath ? 4 : 0 })
      if (!!dataPath) {
        console.log(chalk.yellow('Schema:'))
        console.dir(schema)
      }
      console.log()
    })
  })

  console.log()
}
