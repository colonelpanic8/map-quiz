import type { Topology } from 'topojson-specification'
import regionalCountriesTopology from 'world-atlas/countries-50m.json'
import {
  createTopoQuiz,
  type MapQuizDefinition,
  type QuizProjection,
} from '../lib/quiz-builder.ts'
import { withQuizSubsets } from './shared.ts'
import {
  countryAliases,
  worldCountryNames,
  worldCountryProjectionOptions,
  worldCountrySubsetConfigs,
} from './world-countries.data.ts'

function createWorldCountriesQuiz(
  id: string,
  projection: QuizProjection,
): MapQuizDefinition {
  return {
    ...withQuizSubsets(
      createTopoQuiz({
        aliasesByName: countryAliases,
        credit:
          'World geometry is filtered from world-atlas at 50m resolution so microstates and island countries stay on the board without bringing in non-sovereign territories.',
        description:
          'Treat the world as one large sovereign-country board. Subset filters can focus the active answer bank on overlapping regions such as Europe, Africa, and the Middle East without swapping to a separate quiz.',
        filterFeature: (feature) =>
          typeof feature.properties.name === 'string' &&
          worldCountryNames.has(feature.properties.name),
        height: 560,
        id,
        objectName: 'countries',
        projection,
        prompt:
          'This is the same batch-submission flow at world scale: tiny countries get dot markers when they would otherwise disappear, and subset filters control both the active answers and the reset viewport.',
        timeLimitSeconds: 20 * 60,
        title: 'Countries of the World',
        topology: regionalCountriesTopology as unknown as Topology,
      }),
      worldCountrySubsetConfigs,
    ),
    parentQuizId: id === 'world-countries' ? undefined : 'world-countries',
    projectionOptions: worldCountryProjectionOptions,
    selectedProjectionId: projection,
  }
}

export const worldCountriesQuiz = createWorldCountriesQuiz(
  'world-countries',
  'naturalEarth1',
)

export const worldCountriesEqualEarthQuiz = createWorldCountriesQuiz(
  'world-countries-equal-earth',
  'equalEarth',
)

export const worldCountriesMercatorQuiz = createWorldCountriesQuiz(
  'world-countries-mercator',
  'mercator',
)
