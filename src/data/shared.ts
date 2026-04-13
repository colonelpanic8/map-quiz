import type {
  MapQuizDefinition,
  QuizMapTransform,
  QuizSubset,
} from '../lib/quiz-builder.ts'

export type QuizSubsetConfig = {
  id: string
  title: string
  description?: string
  regionNames: string[]
  viewportRegionNames?: string[]
  initialMapTransform?: QuizMapTransform
}

export function dedupeStrings(values: string[]) {
  return Array.from(new Set(values))
}

export function mergeAliasMaps(...maps: Array<Record<string, string[]>>) {
  return maps.reduce<Record<string, string[]>>((merged, aliasesByName) => {
    for (const [name, aliases] of Object.entries(aliasesByName)) {
      merged[name] = dedupeStrings([...(merged[name] ?? []), ...aliases])
    }

    return merged
  }, {})
}

export function withoutNames(names: Iterable<string>, excludedNames: string[]) {
  const excludedNameSet = new Set(excludedNames)
  return Array.from(names).filter((name) => !excludedNameSet.has(name))
}

function buildRegionIdsFromNames(
  quiz: MapQuizDefinition,
  regionNames: string[],
  subsetId: string,
) {
  const regionIdByName = new Map(quiz.regions.map((region) => [region.name, region.id]))

  return regionNames.map((regionName) => {
    const regionId = regionIdByName.get(regionName)
    if (!regionId) {
      throw new Error(
        `Subset "${subsetId}" references unknown region "${regionName}" on quiz "${quiz.id}".`,
      )
    }

    return regionId
  })
}

export function withQuizSubsets(
  quiz: MapQuizDefinition,
  subsetConfigs: QuizSubsetConfig[],
  options?: { defaultActiveSubsetIds?: string[] },
): MapQuizDefinition {
  const subsets: QuizSubset[] = subsetConfigs.map((subsetConfig) => ({
    description: subsetConfig.description,
    id: subsetConfig.id,
    initialMapTransform: subsetConfig.initialMapTransform,
    regionIds: buildRegionIdsFromNames(
      quiz,
      subsetConfig.regionNames,
      subsetConfig.id,
    ),
    title: subsetConfig.title,
    viewportRegionIds: buildRegionIdsFromNames(
      quiz,
      subsetConfig.viewportRegionNames ?? subsetConfig.regionNames,
      subsetConfig.id,
    ),
  }))

  return {
    ...quiz,
    defaultActiveSubsetIds: options?.defaultActiveSubsetIds ?? [],
    subsets,
  }
}
