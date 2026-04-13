import { feature as topojsonFeature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import usStatesTopology from 'us-atlas/states-10m.json'
import regionalCountriesTopology from 'world-atlas/countries-50m.json'
import worldCountriesTopology from 'world-atlas/countries-110m.json'
import {
  createTopoQuiz,
  type MapQuizDefinition,
  type QuizMapTransform,
  type QuizSubset,
} from '../lib/quiz-builder.ts'

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

const originalThirteenStateNames = [
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
]

const midwestStateNames = [
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
]

const southernStateNames = [
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
]

const worldCountryAliases: Record<string, string[]> = {
  Andorra: ['Principality of Andorra'],
  'Antigua and Barb.': ['Antigua and Barbuda'],
  Bahamas: ['The Bahamas'],
  Bahrain: ['Kingdom of Bahrain'],
  Barbados: ['Republic of Barbados'],
  'Bosnia and Herz.': ['Bosnia and Herzegovina'],
  Brunei: ['Brunei Darussalam'],
  'Cabo Verde': ['Cape Verde', 'Republic of Cabo Verde'],
  Comoros: ['Union of the Comoros'],
  Congo: ['Republic of the Congo', 'Congo-Brazzaville'],
  "Côte d'Ivoire": ['Ivory Coast', "Cote d'Ivoire", 'Cote dIvoire'],
  Czechia: ['Czech Republic'],
  'Dem. Rep. Congo': [
    'DR Congo',
    'D.R. Congo',
    'Democratic Republic of the Congo',
    'Congo-Kinshasa',
  ],
  eSwatini: ['Eswatini', 'Swaziland'],
  Dominica: ['Commonwealth of Dominica'],
  Gambia: ['The Gambia'],
  Grenada: ['State of Grenada'],
  Kiribati: ['Republic of Kiribati'],
  Korea: ['South Korea', 'North Korea'],
  Laos: ["Lao People's Democratic Republic", 'Lao PDR'],
  Liechtenstein: ['Principality of Liechtenstein'],
  Macedonia: ['North Macedonia'],
  Maldives: ['Republic of Maldives'],
  Malta: ['Republic of Malta'],
  'Marshall Is.': ['Marshall Islands', 'Republic of the Marshall Islands'],
  Mauritius: ['Republic of Mauritius'],
  Micronesia: ['Federated States of Micronesia', 'FSM'],
  Moldova: ['Republic of Moldova'],
  Monaco: ['Principality of Monaco'],
  Myanmar: ['Burma'],
  Nauru: ['Republic of Nauru'],
  'North Korea': [
    'DPRK',
    'Democratic People’s Republic of Korea',
    "Democratic People's Republic of Korea",
    'Korea, North',
  ],
  Palau: ['Republic of Palau'],
  Palestine: ['State of Palestine'],
  'Saint Lucia': ['St. Lucia'],
  Samoa: ['Independent State of Samoa'],
  'San Marino': ['Republic of San Marino'],
  Seychelles: ['Republic of Seychelles'],
  Singapore: ['Republic of Singapore'],
  'South Korea': ['Republic of Korea', 'Korea, South'],
  'St. Kitts and Nevis': ['Saint Kitts and Nevis'],
  'St. Vin. and Gren.': [
    'Saint Vincent and the Grenadines',
    'St. Vincent and the Grenadines',
  ],
  'São Tomé and Principe': [
    'Sao Tome and Principe',
    'Democratic Republic of Sao Tome and Principe',
  ],
  Taiwan: ['Republic of China'],
  Tanzania: ['United Republic of Tanzania'],
  'Timor-Leste': ['East Timor'],
  Tonga: ['Kingdom of Tonga'],
  'United Arab Emirates': ['UAE'],
  'United Kingdom': ['UK', 'U.K.', 'Britain', 'Great Britain'],
  'United States of America': [
    'United States',
    'USA',
    'U.S.A.',
    'US',
    'U.S.',
    'America',
  ],
  Venezuela: ['Venezuela, Bolivarian Republic of'],
  Vatican: ['Vatican City', 'Holy See'],
}

const worldCountryExtraNames = new Set([
  'Andorra',
  'Antigua and Barb.',
  'Bahrain',
  'Barbados',
  'Cabo Verde',
  'Comoros',
  'Dominica',
  'Grenada',
  'Kiribati',
  'Liechtenstein',
  'Maldives',
  'Malta',
  'Marshall Is.',
  'Mauritius',
  'Micronesia',
  'Monaco',
  'Nauru',
  'Palau',
  'Saint Lucia',
  'Samoa',
  'San Marino',
  'Seychelles',
  'Singapore',
  'St. Kitts and Nevis',
  'St. Vin. and Gren.',
  'São Tomé and Principe',
  'Tonga',
  'Vatican',
])

function getTopologyFeatureNames(topology: Topology, objectName: string) {
  const object = topology.objects[objectName]
  if (!object) {
    throw new Error(`Topology object "${objectName}" was not found.`)
  }

  return (
    topojsonFeature(topology, object as GeometryCollection) as {
      features: Array<{ properties?: { name?: unknown } }>
    }
  ).features.flatMap((feature) =>
    typeof feature.properties?.name === 'string' ? [feature.properties.name] : [],
  )
}

// Start from the existing 110m world set, then add the sovereign microstates and
// island countries that only appear in the higher-detail 50m atlas.
const worldCountryNames = new Set([
  ...getTopologyFeatureNames(
    worldCountriesTopology as unknown as Topology,
    'countries',
  ),
  ...worldCountryExtraNames,
])

const europeCountryNames = new Set([
  'Albania',
  'Andorra',
  'Armenia',
  'Austria',
  'Azerbaijan',
  'Belarus',
  'Belgium',
  'Bosnia and Herz.',
  'Bulgaria',
  'Croatia',
  'Cyprus',
  'Czechia',
  'Denmark',
  'Estonia',
  'Finland',
  'France',
  'Georgia',
  'Germany',
  'Greece',
  'Hungary',
  'Iceland',
  'Ireland',
  'Italy',
  'Kosovo',
  'Latvia',
  'Liechtenstein',
  'Lithuania',
  'Luxembourg',
  'Macedonia',
  'Malta',
  'Moldova',
  'Monaco',
  'Montenegro',
  'Netherlands',
  'Norway',
  'Poland',
  'Portugal',
  'Romania',
  'Russia',
  'San Marino',
  'Serbia',
  'Slovakia',
  'Slovenia',
  'Spain',
  'Sweden',
  'Switzerland',
  'Turkey',
  'Ukraine',
  'United Kingdom',
  'Vatican',
])

const africaCountryNames = new Set([
  'Algeria',
  'Angola',
  'Benin',
  'Botswana',
  'Burkina Faso',
  'Burundi',
  'Cabo Verde',
  'Cameroon',
  'Central African Rep.',
  'Chad',
  'Comoros',
  'Congo',
  "Côte d'Ivoire",
  'Dem. Rep. Congo',
  'Djibouti',
  'Egypt',
  'Eq. Guinea',
  'Eritrea',
  'Ethiopia',
  'Gabon',
  'Gambia',
  'Ghana',
  'Guinea',
  'Guinea-Bissau',
  'Kenya',
  'Lesotho',
  'Liberia',
  'Libya',
  'Madagascar',
  'Malawi',
  'Mali',
  'Mauritania',
  'Mauritius',
  'Morocco',
  'Mozambique',
  'Namibia',
  'Niger',
  'Nigeria',
  'Rwanda',
  'S. Sudan',
  'Senegal',
  'Seychelles',
  'Sierra Leone',
  'Somalia',
  'South Africa',
  'Sudan',
  'São Tomé and Principe',
  'Tanzania',
  'Togo',
  'Tunisia',
  'Uganda',
  'Zambia',
  'Zimbabwe',
  'eSwatini',
])

const southAmericaCountryNames = new Set([
  'Argentina',
  'Bolivia',
  'Brazil',
  'Chile',
  'Colombia',
  'Ecuador',
  'Guyana',
  'Paraguay',
  'Peru',
  'Suriname',
  'Uruguay',
  'Venezuela',
])

const centralAmericaCountryNames = new Set([
  'Belize',
  'Costa Rica',
  'El Salvador',
  'Guatemala',
  'Honduras',
  'Nicaragua',
  'Panama',
])

const middleEastCountryNames = new Set([
  'Bahrain',
  'Cyprus',
  'Egypt',
  'Iran',
  'Iraq',
  'Israel',
  'Jordan',
  'Kuwait',
  'Lebanon',
  'Oman',
  'Palestine',
  'Qatar',
  'Saudi Arabia',
  'Syria',
  'Turkey',
  'United Arab Emirates',
  'Yemen',
])

const southeastAsiaCountryNames = new Set([
  'Brunei',
  'Cambodia',
  'Indonesia',
  'Laos',
  'Malaysia',
  'Myanmar',
  'Philippines',
  'Singapore',
  'Thailand',
  'Timor-Leste',
  'Vietnam',
])

const americasCountryNames = new Set([
  'Antigua and Barb.',
  'Argentina',
  'Bahamas',
  'Barbados',
  'Belize',
  'Bolivia',
  'Brazil',
  'Canada',
  'Chile',
  'Colombia',
  'Costa Rica',
  'Cuba',
  'Dominica',
  'Dominican Rep.',
  'Ecuador',
  'El Salvador',
  'Grenada',
  'Guatemala',
  'Guyana',
  'Haiti',
  'Honduras',
  'Jamaica',
  'Mexico',
  'Nicaragua',
  'Panama',
  'Paraguay',
  'Peru',
  'Saint Lucia',
  'St. Kitts and Nevis',
  'St. Vin. and Gren.',
  'Suriname',
  'Trinidad and Tobago',
  'United States of America',
  'Uruguay',
  'Venezuela',
])

const easternEuropeCountryNames = new Set([
  'Albania',
  'Belarus',
  'Bosnia and Herz.',
  'Bulgaria',
  'Croatia',
  'Czechia',
  'Estonia',
  'Hungary',
  'Kosovo',
  'Latvia',
  'Lithuania',
  'Macedonia',
  'Moldova',
  'Montenegro',
  'Poland',
  'Romania',
  'Russia',
  'Serbia',
  'Slovakia',
  'Slovenia',
  'Ukraine',
])

const europeCountryAliases: Record<string, string[]> = {
  ...worldCountryAliases,
  Netherlands: ['Holland'],
  Russia: ['Russian Federation'],
  Turkey: ['Turkiye', 'Türkiye', 'Republic of Turkey', 'Republic of Türkiye'],
  Vatican: ['Vatican City', 'Holy See'],
}

const africaCountryAliases: Record<string, string[]> = {
  ...worldCountryAliases,
  Algeria: ["People's Democratic Republic of Algeria"],
  'Cabo Verde': ['Cape Verde', 'Republic of Cabo Verde'],
  'Central African Rep.': ['Central African Republic'],
  Comoros: ['Union of the Comoros'],
  Egypt: ['Arab Republic of Egypt'],
  'Eq. Guinea': ['Equatorial Guinea', 'Republic of Equatorial Guinea'],
  'Guinea-Bissau': ['Guinea Bissau', 'Republic of Guinea-Bissau'],
  Libya: ['State of Libya'],
  Mauritius: ['Republic of Mauritius'],
  Morocco: ['Kingdom of Morocco'],
  'S. Sudan': ['South Sudan', 'Republic of South Sudan'],
  Seychelles: ['Republic of Seychelles'],
  Somalia: ['Federal Republic of Somalia'],
  'South Africa': ['Republic of South Africa'],
  'São Tomé and Principe': [
    'Sao Tome and Principe',
    'Democratic Republic of Sao Tome and Principe',
  ],
  Tunisia: ['Republic of Tunisia'],
  Uganda: ['Republic of Uganda'],
}

const southAmericaCountryAliases: Record<string, string[]> = {
  ...worldCountryAliases,
  Argentina: ['Argentine Republic'],
  Bolivia: ['Bolivia, Plurinational State of', 'Plurinational State of Bolivia'],
  Brazil: ['Federative Republic of Brazil'],
  Chile: ['Republic of Chile'],
  Colombia: ['Republic of Colombia'],
  Ecuador: ['Republic of Ecuador'],
  Guyana: ['Co-operative Republic of Guyana', 'Cooperative Republic of Guyana'],
  Paraguay: ['Republic of Paraguay'],
  Peru: ['Republic of Peru'],
  Suriname: ['Republic of Suriname'],
  Uruguay: ['Oriental Republic of Uruguay'],
}

const centralAmericaCountryAliases: Record<string, string[]> = {
  ...worldCountryAliases,
  'Costa Rica': ['Republic of Costa Rica'],
  'El Salvador': ['Republic of El Salvador'],
  Guatemala: ['Republic of Guatemala'],
  Honduras: ['Republic of Honduras'],
  Nicaragua: ['Republic of Nicaragua'],
  Panama: ['Republic of Panama'],
}

const middleEastCountryAliases: Record<string, string[]> = {
  ...worldCountryAliases,
  Bahrain: ['Kingdom of Bahrain'],
  Egypt: ['Arab Republic of Egypt'],
  Iran: ['Islamic Republic of Iran'],
  Oman: ['Sultanate of Oman'],
  Palestine: [
    'State of Palestine',
    'Palestinian Territories',
    'Occupied Palestinian Territories',
  ],
  Syria: ['Syrian Arab Republic'],
  Yemen: ['Republic of Yemen'],
}

type QuizSubsetConfig = {
  id: string
  title: string
  description?: string
  regionNames: string[]
  viewportRegionNames?: string[]
  initialMapTransform?: QuizMapTransform
}

function dedupeStrings(values: string[]) {
  return Array.from(new Set(values))
}

function mergeAliasMaps(...maps: Array<Record<string, string[]>>) {
  return maps.reduce<Record<string, string[]>>((merged, aliasesByName) => {
    for (const [name, aliases] of Object.entries(aliasesByName)) {
      merged[name] = dedupeStrings([...(merged[name] ?? []), ...aliases])
    }

    return merged
  }, {})
}

function withoutNames(names: Iterable<string>, excludedNames: string[]) {
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

function withQuizSubsets(
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

const countryAliases = mergeAliasMaps(
  worldCountryAliases,
  europeCountryAliases,
  africaCountryAliases,
  southAmericaCountryAliases,
  centralAmericaCountryAliases,
  middleEastCountryAliases,
)

const usStateSubsetConfigs: QuizSubsetConfig[] = [
  {
    description:
      'Practice the original thirteen colonies along the Atlantic seaboard.',
    id: 'original-thirteen',
    regionNames: originalThirteenStateNames,
    title: 'Original 13',
  },
  {
    description:
      'Practice the core Midwestern states from the Plains through the Great Lakes.',
    id: 'midwest',
    regionNames: midwestStateNames,
    title: 'Midwest',
  },
  {
    description:
      'Practice a broad South grouping spanning the Southeast, Appalachia, and Texas.',
    id: 'south',
    regionNames: southernStateNames,
    title: 'South',
  },
]

const worldCountrySubsetConfigs: QuizSubsetConfig[] = [
  {
    description:
      'Focus on Europe, while keeping the viewport tight enough that western Russia does not force a full Eurasia frame.',
    id: 'europe',
    regionNames: Array.from(europeCountryNames),
    title: 'Europe',
    viewportRegionNames: withoutNames(europeCountryNames, ['Russia']),
  },
  {
    description:
      'Focus on African countries and nearby island states.',
    id: 'africa',
    regionNames: Array.from(africaCountryNames),
    title: 'Africa',
  },
  {
    description:
      'Focus on the sovereign countries of South America.',
    id: 'south-america',
    regionNames: Array.from(southAmericaCountryNames),
    title: 'South America',
  },
  {
    description:
      'Focus on the Central American isthmus from Belize to Panama.',
    id: 'central-america',
    regionNames: Array.from(centralAmericaCountryNames),
    title: 'Central America',
  },
  {
    description:
      'Focus on the Middle East and eastern Mediterranean, with intentional overlap into North Africa and Anatolia.',
    id: 'middle-east',
    regionNames: Array.from(middleEastCountryNames),
    title: 'Middle East',
  },
  {
    description:
      'Focus on mainland and maritime Southeast Asia from Myanmar through Indonesia and the Philippines.',
    id: 'southeast-asia',
    regionNames: Array.from(southeastAsiaCountryNames),
    title: 'Southeast Asia',
  },
  {
    description:
      'Focus on the sovereign countries of North America, Central America, the Caribbean, and South America.',
    id: 'americas',
    regionNames: Array.from(americasCountryNames),
    title: 'The Americas',
  },
  {
    description:
      'Focus on Eastern Europe and the Balkans, while keeping Russia from forcing the reset viewport across all of Siberia.',
    id: 'eastern-europe',
    regionNames: Array.from(easternEuropeCountryNames),
    title: 'Eastern Europe',
    viewportRegionNames: withoutNames(easternEuropeCountryNames, ['Russia']),
  },
]

const usStatesQuiz = withQuizSubsets(
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

const worldCountriesQuiz = withQuizSubsets(
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
    id: 'world-countries',
    objectName: 'countries',
    projection: 'naturalEarth1',
    prompt:
      'This is the same batch-submission flow at world scale: tiny countries get dot markers when they would otherwise disappear, and subset filters control both the active answers and the reset viewport.',
    timeLimitSeconds: 20 * 60,
    title: 'Countries of the World',
    topology: regionalCountriesTopology as unknown as Topology,
  }),
  worldCountrySubsetConfigs,
)

export const quizzes = [usStatesQuiz, worldCountriesQuiz]

export const defaultQuizId = quizzes[0].id
