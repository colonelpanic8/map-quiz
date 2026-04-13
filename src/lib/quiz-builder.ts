import {
  geoAlbersUsa,
  geoEqualEarth,
  geoMercator,
  geoNaturalEarth1,
  geoPath,
  type GeoPath,
  type GeoProjection,
} from 'd3-geo'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import { feature as topojsonFeature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'

export type QuizProjection =
  | 'albersUsa'
  | 'equalEarth'
  | 'mercator'
  | 'naturalEarth1'

export type QuizProjectionOption = {
  id: QuizProjection
  label: string
  quizId: string
}

export type QuizMapTransform = {
  scale: number
  x: number
  y: number
}

export type QuizBounds = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export type QuizRegion = {
  id: string
  name: string
  aliases: string[]
  bounds: QuizBounds
  labelBounds: {
    height: number
    width: number
  }
  labelPosition: {
    x: number
    y: number
  }
  path: string
}

export type QuizSubset = {
  id: string
  title: string
  description?: string
  regionIds: string[]
  viewportRegionIds: string[]
  initialMapTransform?: QuizMapTransform
}

export type MapQuizDefinition = {
  id: string
  parentQuizId?: string
  title: string
  description: string
  prompt: string
  credit: string
  timeLimitSeconds: number
  initialMapTransform?: QuizMapTransform
  defaultActiveSubsetIds?: string[]
  projectionOptions?: QuizProjectionOption[]
  selectedProjectionId?: QuizProjection
  subsets?: QuizSubset[]
  viewBox: {
    width: number
    height: number
  }
  regions: QuizRegion[]
}

type BaseQuizOptions = {
  id: string
  title: string
  description: string
  prompt: string
  credit: string
  timeLimitSeconds: number
  initialMapTransform?: QuizMapTransform
}

type GeoQuizOptions = BaseQuizOptions & {
  aliasesById?: Record<string, string[]>
  aliasesByName?: Record<string, string[]>
  features: FeatureCollection<Geometry, Record<string, unknown>>
  filterFeature?: (
    feature: Feature<Geometry, Record<string, unknown>>,
  ) => boolean
  getId?: (feature: Feature<Geometry, Record<string, unknown>>) => string
  getName?: (feature: Feature<Geometry, Record<string, unknown>>) => string
  height?: number
  padding?: number
  projectionScaleFactor?: number
  projection: QuizProjection
  width?: number
}

type TopoQuizOptions = Omit<GeoQuizOptions, 'features'> & {
  objectName: string
  topology: Topology
}

type PolygonRegionInput = {
  aliases?: string[]
  id: string
  name: string
  points: Array<[number, number]>
}

type PolygonQuizOptions = BaseQuizOptions & {
  regions: PolygonRegionInput[]
  viewBox: {
    width: number
    height: number
  }
}

const DEFAULT_WIDTH = 960
const DEFAULT_HEIGHT = 620
const DEFAULT_PADDING = 24
type QuizFeature = Feature<Geometry, Record<string, unknown>>

function createProjection(projection: QuizProjection): GeoProjection {
  switch (projection) {
    case 'albersUsa':
      return geoAlbersUsa()
    case 'mercator':
      return geoMercator()
    case 'naturalEarth1':
      return geoNaturalEarth1()
    case 'equalEarth':
    default:
      return geoEqualEarth()
  }
}

function dedupeAliases(aliases: string[]) {
  return Array.from(new Set(aliases.filter(Boolean)))
}

function resolveAliases(
  id: string,
  name: string,
  aliasesById?: Record<string, string[]>,
  aliasesByName?: Record<string, string[]>,
) {
  return dedupeAliases([
    ...(aliasesById?.[id] ?? []),
    ...(aliasesByName?.[name] ?? []),
  ])
}

function getDefaultFeatureId(feature: Feature<Geometry, Record<string, unknown>>) {
  const rawId =
    feature.id ??
    feature.properties.id ??
    feature.properties.iso_n3 ??
    feature.properties.name
  if (!rawId) {
    throw new Error('Each feature needs an id or a property that can be used as one.')
  }

  return String(rawId)
}

function getDefaultFeatureName(feature: Feature<Geometry, Record<string, unknown>>) {
  const rawName = feature.properties.name
  if (!rawName || typeof rawName !== 'string') {
    throw new Error('Each feature needs a string `name` property.')
  }

  return rawName
}

function buildFeatureWithGeometry(feature: QuizFeature, geometry: Geometry): QuizFeature {
  return {
    ...feature,
    geometry,
  }
}

function getLabelFeature(feature: QuizFeature, pathBuilder: GeoPath): QuizFeature {
  if (feature.geometry.type !== 'MultiPolygon') {
    return feature
  }

  // Detached overseas fragments can distort label placement for sovereign states
  // like France, so anchor labels to the largest projected polygon instead.
  let largestPolygonFeature: QuizFeature | null = null
  let largestPolygonArea = Number.NEGATIVE_INFINITY

  for (const coordinates of feature.geometry.coordinates) {
    const polygonFeature = buildFeatureWithGeometry(feature, {
      type: 'Polygon',
      coordinates,
    })
    const polygonArea = pathBuilder.area(polygonFeature)

    if (polygonArea > largestPolygonArea) {
      largestPolygonArea = polygonArea
      largestPolygonFeature = polygonFeature
    }
  }

  return largestPolygonFeature ?? feature
}

export function createGeoQuiz({
  aliasesById,
  aliasesByName,
  credit,
  description,
  features,
  filterFeature,
  getId = getDefaultFeatureId,
  getName = getDefaultFeatureName,
  height = DEFAULT_HEIGHT,
  id,
  initialMapTransform,
  padding = DEFAULT_PADDING,
  projectionScaleFactor = 1,
  projection,
  prompt,
  timeLimitSeconds,
  title,
  width = DEFAULT_WIDTH,
}: GeoQuizOptions): MapQuizDefinition {
  const filteredFeatures = features.features.filter((feature) =>
    filterFeature ? filterFeature(feature) : true,
  )
  const projectedFeatures: FeatureCollection<Geometry, Record<string, unknown>> = {
    ...features,
    features: filteredFeatures,
  }
  const fittedProjection = createProjection(projection).fitExtent(
    [
      [padding, padding],
      [width - padding, height - padding],
    ],
    projectedFeatures,
  )
  if (projectionScaleFactor !== 1) {
    fittedProjection.scale(fittedProjection.scale() * projectionScaleFactor)
  }
  const pathBuilder = geoPath(fittedProjection)

  const regions = filteredFeatures.flatMap((feature) => {
    const path = pathBuilder(feature)
    if (!path) {
      return []
    }

    const labelFeature = getLabelFeature(feature, pathBuilder)
    const regionId = getId(feature)
    const regionName = getName(feature)
    const [[minX, minY], [maxX, maxY]] = pathBuilder.bounds(labelFeature)
    const [centroidX, centroidY] = pathBuilder.centroid(labelFeature)
    const labelPosition =
      Number.isFinite(centroidX) && Number.isFinite(centroidY)
        ? { x: centroidX, y: centroidY }
        : { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }

    return [
      {
        aliases: resolveAliases(regionId, regionName, aliasesById, aliasesByName),
        bounds: {
          maxX,
          maxY,
          minX,
          minY,
        },
        id: regionId,
        labelBounds: {
          height: Math.max(0, maxY - minY),
          width: Math.max(0, maxX - minX),
        },
        labelPosition,
        name: regionName,
        path,
      },
    ]
  })

  return {
    credit,
    description,
    id,
    initialMapTransform,
    prompt,
    regions,
    timeLimitSeconds,
    title,
    viewBox: {
      height,
      width,
    },
  }
}

export function createTopoQuiz({
  objectName,
  topology,
  ...rest
}: TopoQuizOptions): MapQuizDefinition {
  const object = topology.objects[objectName]
  if (!object) {
    throw new Error(`Topology object "${objectName}" was not found.`)
  }

  const featureCollection = topojsonFeature(
    topology,
    object as GeometryCollection,
  ) as FeatureCollection<Geometry, Record<string, unknown>>

  return createGeoQuiz({
    ...rest,
    features: featureCollection,
  })
}

function polygonToPath(points: Array<[number, number]>) {
  if (points.length === 0) {
    return ''
  }

  const [firstX, firstY] = points[0]
  const segments = points
    .slice(1)
    .map(([x, y]) => `L ${x} ${y}`)
    .join(' ')

  return `M ${firstX} ${firstY} ${segments} Z`
}

function getPolygonBounds(points: Array<[number, number]>) {
  if (points.length === 0) {
    return {
      maxX: 0,
      maxY: 0,
      minX: 0,
      minY: 0,
    }
  }

  return points.reduce(
    (bounds, [x, y]) => ({
      maxX: Math.max(bounds.maxX, x),
      maxY: Math.max(bounds.maxY, y),
      minX: Math.min(bounds.minX, x),
      minY: Math.min(bounds.minY, y),
    }),
    {
      maxX: points[0][0],
      maxY: points[0][1],
      minX: points[0][0],
      minY: points[0][1],
    },
  )
}

export function createPolygonQuiz({
  credit,
  description,
  id,
  prompt,
  regions,
  timeLimitSeconds,
  title,
  viewBox,
}: PolygonQuizOptions): MapQuizDefinition {
  return {
    credit,
    description,
    id,
    prompt,
    regions: regions.map((region) => ({
      ...(() => {
        const bounds = getPolygonBounds(region.points)

        return {
          aliases: dedupeAliases(region.aliases ?? []),
          bounds: {
            maxX: bounds.maxX,
            maxY: bounds.maxY,
            minX: bounds.minX,
            minY: bounds.minY,
          },
          id: region.id,
          labelBounds: {
            height: Math.max(0, bounds.maxY - bounds.minY),
            width: Math.max(0, bounds.maxX - bounds.minX),
          },
          labelPosition: {
            x: (bounds.minX + bounds.maxX) / 2,
            y: (bounds.minY + bounds.maxY) / 2,
          },
          name: region.name,
          path: polygonToPath(region.points),
        }
      })(),
    })),
    timeLimitSeconds,
    title,
    viewBox,
  }
}
