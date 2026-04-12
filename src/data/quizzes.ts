import { feature as topojsonFeature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import usStatesTopology from 'us-atlas/states-10m.json'
import regionalCountriesTopology from 'world-atlas/countries-50m.json'
import worldCountriesTopology from 'world-atlas/countries-110m.json'
import { createTopoQuiz } from '../lib/quiz-builder.ts'

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

export const quizzes = [
  createTopoQuiz({
    aliasesByName: usStateAliases,
    credit:
      'US geometry comes from us-atlas. The interaction is inspired by Sporcle picture-click quizzes, but this version grades the whole map in one batch.',
    description:
      'Place every US state on the map before grading. You can work in any order and revise placements until you submit.',
    filterFeature: (feature) =>
      typeof feature.properties.name === 'string' &&
      usStateNames.has(feature.properties.name),
    id: 'us-states',
    objectName: 'states',
    projection: 'albersUsa',
    prompt:
      'Select a region and then a label, or choose a label first and click the map. Nothing is checked until you hit Grade Map.',
    timeLimitSeconds: 7 * 60,
    title: 'Find the US States',
    topology: usStatesTopology as unknown as Topology,
  }),
  createTopoQuiz({
    aliasesByName: europeCountryAliases,
    credit:
      'Europe geometry is filtered from world-atlas at 50m resolution so the microstates remain visible and selectable.',
    description:
      'Batch-label Europe on a tighter regional map, including commonly grouped transcontinental countries such as Armenia, Azerbaijan, Georgia, Russia, and Turkey.',
    filterFeature: (feature) =>
      typeof feature.properties.name === 'string' &&
      europeCountryNames.has(feature.properties.name),
    height: 700,
    id: 'europe-countries',
    objectName: 'countries',
    projection: 'mercator',
    prompt:
      'Place every European country before grading. Zoom in for the microstates and island countries when you need more precision.',
    timeLimitSeconds: 12 * 60,
    title: 'Countries of Europe',
    topology: regionalCountriesTopology as unknown as Topology,
  }),
  createTopoQuiz({
    aliasesByName: africaCountryAliases,
    credit:
      'Africa geometry is filtered from world-atlas at 50m resolution so the island states and narrow coastal countries remain selectable.',
    description:
      'Batch-label the countries of Africa on a regional map spanning the continent and its major island nations.',
    filterFeature: (feature) =>
      typeof feature.properties.name === 'string' &&
      africaCountryNames.has(feature.properties.name),
    height: 760,
    id: 'africa-countries',
    objectName: 'countries',
    projection: 'mercator',
    prompt:
      'Place every African country before grading. Zoom in around West Africa, the Horn, and the Gulf of Guinea when borders get dense.',
    timeLimitSeconds: 12 * 60,
    title: 'Countries of Africa',
    topology: regionalCountriesTopology as unknown as Topology,
  }),
  createTopoQuiz({
    aliasesByName: southAmericaCountryAliases,
    credit:
      'South America geometry is filtered from world-atlas at 50m resolution so the continent stays detailed enough for the Andean corridor and the Guianas.',
    description:
      'Batch-label the sovereign countries of South America on a continent-scale regional map.',
    filterFeature: (feature) =>
      typeof feature.properties.name === 'string' &&
      southAmericaCountryNames.has(feature.properties.name),
    height: 760,
    id: 'south-america-countries',
    objectName: 'countries',
    projection: 'mercator',
    prompt:
      'Place every South American country before grading. Zoom in along the Andes and the northern coast when neighboring borders get tight.',
    timeLimitSeconds: 7 * 60,
    title: 'Countries of South America',
    topology: regionalCountriesTopology as unknown as Topology,
  }),
  createTopoQuiz({
    aliasesByName: centralAmericaCountryAliases,
    credit:
      'Central America geometry is filtered from world-atlas at 50m resolution so the narrow isthmus countries remain distinct and selectable.',
    description:
      'Batch-label the sovereign countries of Central America on a regional map from Belize to Panama.',
    filterFeature: (feature) =>
      typeof feature.properties.name === 'string' &&
      centralAmericaCountryNames.has(feature.properties.name),
    height: 620,
    id: 'central-america-countries',
    objectName: 'countries',
    projection: 'mercator',
    prompt:
      'Place every Central American country before grading. Zoom in along the Pacific side and around the Gulf of Honduras when borders get tight.',
    timeLimitSeconds: 5 * 60,
    title: 'Countries of Central America',
    topology: regionalCountriesTopology as unknown as Topology,
  }),
  createTopoQuiz({
    aliasesByName: middleEastCountryAliases,
    credit:
      'Middle East geometry is filtered from world-atlas at 50m resolution so the eastern Mediterranean and Gulf states remain easy to target.',
    description:
      'Batch-label the Middle East on a regional map spanning Egypt, the Levant, Anatolia, the Arabian Peninsula, and Iran.',
    filterFeature: (feature) =>
      typeof feature.properties.name === 'string' &&
      middleEastCountryNames.has(feature.properties.name),
    height: 680,
    id: 'middle-east-countries',
    objectName: 'countries',
    projection: 'mercator',
    prompt:
      'Place every Middle Eastern country before grading. Zoom in around the Levant and the Gulf when neighboring countries crowd together.',
    timeLimitSeconds: 8 * 60,
    title: 'Countries of the Middle East',
    topology: regionalCountriesTopology as unknown as Topology,
  }),
  createTopoQuiz({
    aliasesByName: worldCountryAliases,
    credit:
      'World geometry is filtered from world-atlas at 50m resolution so microstates and island countries stay on the board without bringing in non-sovereign territories.',
    description:
      'Batch-label the world with a fuller sovereign-country set, including small states that disappear at coarser map resolutions.',
    filterFeature: (feature) =>
      typeof feature.properties.name === 'string' &&
      worldCountryNames.has(feature.properties.name),
    height: 560,
    id: 'world-countries',
    objectName: 'countries',
    projection: 'naturalEarth1',
    prompt:
      'This is the same batch-submission flow at a larger scale: tiny countries get dot markers when they would otherwise disappear, and the whole board still grades in one batch.',
    timeLimitSeconds: 20 * 60,
    title: 'Countries of the World',
    topology: regionalCountriesTopology as unknown as Topology,
  }),
]

export const defaultQuizId = quizzes[0].id
