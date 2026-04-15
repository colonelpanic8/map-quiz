import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson'
import {
  feature as topojsonFeature,
  merge as topojsonMerge,
} from 'topojson-client'
import type {
  GeometryCollection,
  GeometryObject,
  MultiPolygon as TopoJsonMultiPolygon,
  Polygon as TopoJsonPolygon,
  Topology,
} from 'topojson-specification'
import regionalCountriesTopology from 'world-atlas/countries-50m.json'
import {
  createGeoQuiz,
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

const COUNTRIES_OBJECT_NAME = 'countries'
const SOMALIA_NAME = 'Somalia'
const SOMALILAND_NAME = 'Somaliland'

type TopoJsonCountryPolygon =
  | TopoJsonPolygon<GeoJsonProperties>
  | TopoJsonMultiPolygon<GeoJsonProperties>
type TopoJsonMergePolygon = TopoJsonPolygon | TopoJsonMultiPolygon

function getTopologyCountryName(geometry: GeometryObject<GeoJsonProperties>) {
  const properties = geometry.properties as
    | Record<string, unknown>
    | null
    | undefined
  const name = properties?.name
  return typeof name === 'string' ? name : undefined
}

function isTopologyCountryPolygon(
  geometry: GeometryObject<GeoJsonProperties>,
): geometry is TopoJsonCountryPolygon {
  return geometry.type === 'Polygon' || geometry.type === 'MultiPolygon'
}

function getNamedTopologyCountry(
  collection: GeometryCollection<GeoJsonProperties>,
  name: string,
): TopoJsonCountryPolygon {
  const geometry = collection.geometries.find(
    (entry) => getTopologyCountryName(entry) === name,
  )
  if (!geometry || !isTopologyCountryPolygon(geometry)) {
    throw new Error(`Topology country "${name}" was not found.`)
  }

  return geometry
}

function getCountriesTopologyObject(
  topology: Topology,
): GeometryCollection<GeoJsonProperties> {
  const object = topology.objects[COUNTRIES_OBJECT_NAME]
  if (!object || object.type !== 'GeometryCollection') {
    throw new Error(`Topology object "${COUNTRIES_OBJECT_NAME}" was not found.`)
  }

  return object as GeometryCollection<GeoJsonProperties>
}

function createWorldCountriesFeatureCollection(
  topology: Topology,
): FeatureCollection<Geometry, Record<string, unknown>> {
  const countriesObject = getCountriesTopologyObject(topology)
  const mergedSomaliaGeometry = topojsonMerge(
    topology,
    [
      getNamedTopologyCountry(countriesObject, SOMALIA_NAME),
      getNamedTopologyCountry(countriesObject, SOMALILAND_NAME),
    ] as unknown as TopoJsonMergePolygon[],
  )
  const featureCollection = topojsonFeature(
    topology,
    countriesObject,
  ) as FeatureCollection<Geometry, Record<string, unknown>>

  return {
    ...featureCollection,
    features: featureCollection.features.flatMap((feature) => {
      const name = feature.properties.name
      if (name === SOMALILAND_NAME) {
        return []
      }
      if (name === SOMALIA_NAME) {
        return [
          {
            ...feature,
            geometry: mergedSomaliaGeometry,
          },
        ]
      }

      return [feature]
    }),
  }
}

function createWorldCountriesQuiz(
  id: string,
  projection: QuizProjection,
): MapQuizDefinition {
  const topology = regionalCountriesTopology as unknown as Topology

  return {
    ...withQuizSubsets(
      createGeoQuiz({
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
        features: createWorldCountriesFeatureCollection(topology),
        projection,
        prompt:
          'This is the same batch-submission flow at world scale: tiny countries get dot markers when they would otherwise disappear, and subset filters control both the active answers and the reset viewport.',
        timeLimitSeconds: 20 * 60,
        title: 'Countries of the World',
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
