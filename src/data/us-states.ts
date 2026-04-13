import type { Topology } from 'topojson-specification'
import usStatesTopology from 'us-atlas/states-10m.json'
import { createTopoQuiz, type MapQuizDefinition } from '../lib/quiz-builder.ts'
import { withQuizSubsets, type QuizSubsetConfig } from './shared.ts'

const usStateAliases: Record<string, string[]> = {
  Alabama: ['AL'],
  Alaska: ['AK'],
  Arizona: ['AZ'],
  Arkansas: ['AR'],
  California: ['CA'],
  Colorado: ['CO'],
  Connecticut: ['CT'],
  Delaware: ['DE'],
  Florida: ['FL'],
  Georgia: ['GA'],
  Hawaii: ['HI'],
  Idaho: ['ID'],
  Illinois: ['IL'],
  Indiana: ['IN'],
  Iowa: ['IA'],
  Kansas: ['KS'],
  Kentucky: ['KY'],
  Louisiana: ['LA'],
  Maine: ['ME'],
  Maryland: ['MD'],
  Massachusetts: ['MA'],
  Michigan: ['MI'],
  Minnesota: ['MN'],
  Mississippi: ['MS'],
  Missouri: ['MO'],
  Montana: ['MT'],
  Nebraska: ['NE'],
  Nevada: ['NV'],
  'New Hampshire': ['NH'],
  'New Jersey': ['NJ'],
  'New Mexico': ['NM'],
  'New York': ['NY'],
  'North Carolina': ['NC'],
  'North Dakota': ['ND'],
  Ohio: ['OH'],
  Oklahoma: ['OK'],
  Oregon: ['OR'],
  Pennsylvania: ['PA'],
  'Rhode Island': ['RI'],
  'South Carolina': ['SC'],
  'South Dakota': ['SD'],
  Tennessee: ['TN'],
  Texas: ['TX'],
  Utah: ['UT'],
  Vermont: ['VT'],
  Virginia: ['VA'],
  Washington: ['WA'],
  'West Virginia': ['WV'],
  Wisconsin: ['WI'],
  Wyoming: ['WY'],
}

const usStateNames = new Set(Object.keys(usStateAliases))

const usStateSubsetConfigs: QuizSubsetConfig[] = [
  {
    description:
      'Practice the original thirteen colonies along the Atlantic seaboard.',
    id: 'original-thirteen',
    regionNames: [
      'Connecticut',
      'Delaware',
      'Georgia',
      'Maryland',
      'Massachusetts',
      'New Hampshire',
      'New Jersey',
      'New York',
      'North Carolina',
      'Pennsylvania',
      'Rhode Island',
      'South Carolina',
      'Virginia',
    ],
    title: 'Original 13',
  },
  {
    description:
      'Practice the core Midwestern states from the Plains through the Great Lakes.',
    id: 'midwest',
    regionNames: [
      'Illinois',
      'Indiana',
      'Iowa',
      'Kansas',
      'Michigan',
      'Minnesota',
      'Missouri',
      'Nebraska',
      'North Dakota',
      'Ohio',
      'South Dakota',
      'Wisconsin',
    ],
    title: 'Midwest',
  },
  {
    description:
      'Practice a broad South grouping spanning the Southeast, Appalachia, and Texas.',
    id: 'south',
    regionNames: [
      'Alabama',
      'Arkansas',
      'Florida',
      'Georgia',
      'Kentucky',
      'Louisiana',
      'Mississippi',
      'North Carolina',
      'Oklahoma',
      'South Carolina',
      'Tennessee',
      'Texas',
      'Virginia',
      'West Virginia',
    ],
    title: 'South',
  },
]

export const usStatesQuiz: MapQuizDefinition = withQuizSubsets(
  createTopoQuiz({
    aliasesByName: usStateAliases,
    credit:
      'US geometry comes from us-atlas. The interaction is inspired by Sporcle picture-click quizzes, but this version grades the whole map in one batch.',
    description:
      'Place every active US state on the map before grading. Subset filters let you practice overlapping state groupings without switching to a different board.',
    filterFeature: (feature) =>
      typeof feature.properties.name === 'string' &&
      usStateNames.has(feature.properties.name),
    id: 'us-states',
    objectName: 'states',
    projection: 'albersUsa',
    prompt:
      'Select a region and then a label, or choose a label first and click the map. Subset filters can narrow the board without changing the underlying map.',
    timeLimitSeconds: 7 * 60,
    title: 'Find the US States',
    topology: usStatesTopology as unknown as Topology,
  }),
  usStateSubsetConfigs,
)
