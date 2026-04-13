import type {
  MapQuizDefinition,
  QuizBounds,
  QuizMapTransform,
  QuizRegion,
} from './quiz-builder.ts'

export type AssignmentMap = Record<string, string | null>

export type ResultStatus = 'correct' | 'incorrect' | 'missing'
export type RegionStatus = ResultStatus | 'assigned' | 'idle' | 'inactive'
export type AnswerStatus =
  | 'available'
  | 'placed'
  | 'missing'
  | 'correct'
  | 'misplaced'
export type AnswerStateLabel = AnswerStatus | 'selected'
export type QuizResult = {
  guessId: string | null
  id: string
  name: string
  status: ResultStatus
}

export type MapTransform = { scale: number; x: number; y: number }
export type MapPoint = { x: number; y: number }
export type TrackedPointer = MapPoint & { clientX: number; clientY: number }
export type SelectionMenuState = {
  left: number
  maxHeight: number
  top: number
  width: number
}
export type DragGesture = {
  pointerId: number
  startClientX: number
  startClientY: number
  startPoint: MapPoint
  startTransform: MapTransform
}
export type PinchGesture = { distance: number; midpoint: MapPoint }

type ViewBox = { height: number; width: number }

export const MIN_MAP_SCALE = 1
export const MAP_ZOOM_BUTTON_STEP = 1.25
export const DRAG_SUPPRESSION_DISTANCE = 8
export const MAP_SELECTION_MENU_MARGIN = 12
export const MAP_SELECTION_MENU_MAX_WIDTH = 320
export const MAP_SELECTION_MENU_MAX_HEIGHT = 360
export const MAP_SELECTION_MENU_RESERVED_HEIGHT = 132
export const MAP_SELECTION_MENU_ROW_HEIGHT = 46
const MIN_REGION_LABEL_FONT_SIZE = 7.5
const BASE_MAX_REGION_LABEL_FONT_SIZE = 17
const MAX_REGION_LABEL_FONT_SIZE = 24
const SMALL_REGION_MARKER_MAX_DIMENSION = 18
const SMALL_REGION_MARKER_THIN_DIMENSION = 10
const SMALL_REGION_MARKER_THIN_MAX_DIMENSION = 28
const SMALL_REGION_MARKER_MIN_DOT_RADIUS = 3.4
const SMALL_REGION_MARKER_MAX_DOT_RADIUS = 6.8
const SMALL_REGION_MARKER_MIN_HIT_RADIUS = 10.5
const DEFAULT_SUBSET_VIEW_PADDING = 28

type RegionOverlayLabel = {
  fontSize: number
  text: string
}

type SmallRegionMarker = {
  dotRadius: number
  hitRadius: number
  ringRadius: number
}

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum)
}

export function clampMapTransform(transform: MapTransform, viewBox: ViewBox) {
  const nextScale = Math.max(transform.scale, MIN_MAP_SCALE)
  const minX = viewBox.width * (1 - nextScale)
  const minY = viewBox.height * (1 - nextScale)

  return {
    scale: nextScale,
    x: clamp(transform.x, minX, 0),
    y: clamp(transform.y, minY, 0),
  }
}

export function zoomMapTransform(
  transform: MapTransform,
  nextScale: number,
  anchor: MapPoint,
  viewBox: ViewBox,
) {
  const clampedScale = Math.max(nextScale, MIN_MAP_SCALE)
  const scaleRatio = clampedScale / transform.scale

  return clampMapTransform(
    {
      scale: clampedScale,
      x: anchor.x - scaleRatio * (anchor.x - transform.x),
      y: anchor.y - scaleRatio * (anchor.y - transform.y),
    },
    viewBox,
  )
}

export function getQuizDefinition(
  availableQuizzes: MapQuizDefinition[],
  quizId: string,
) {
  return availableQuizzes.find((entry) => entry.id === quizId) ?? availableQuizzes[0]
}

export function getQuizPickerId(
  quiz: Pick<MapQuizDefinition, 'id' | 'parentQuizId'>,
) {
  return quiz.parentQuizId ?? quiz.id
}

export function buildRegionById(quiz: MapQuizDefinition) {
  return Object.fromEntries(quiz.regions.map((region) => [region.id, region]))
}

function getBaseMapTransform(
  quiz: Pick<MapQuizDefinition, 'initialMapTransform' | 'viewBox'>,
): MapTransform {
  return clampMapTransform(
    quiz.initialMapTransform ?? {
      scale: 1,
      x: 0,
      y: 0,
    },
    quiz.viewBox,
  )
}

export function getDefaultActiveSubsetIds(quiz: MapQuizDefinition) {
  return quiz.defaultActiveSubsetIds ?? []
}

function getSubsetById(quiz: MapQuizDefinition) {
  return new Map((quiz.subsets ?? []).map((subset) => [subset.id, subset]))
}

export function getActiveSubsets(
  quiz: MapQuizDefinition,
  activeSubsetIds: string[],
) {
  if (!quiz.subsets?.length || activeSubsetIds.length === 0) {
    return []
  }

  const subsetById = getSubsetById(quiz)

  return activeSubsetIds.flatMap((subsetId) => {
    const subset = subsetById.get(subsetId)
    return subset ? [subset] : []
  })
}

export function getActiveRegionIdSet(
  quiz: MapQuizDefinition,
  activeSubsetIds: string[],
) {
  if (!quiz.subsets?.length || activeSubsetIds.length === 0) {
    return new Set(quiz.regions.map((region) => region.id))
  }

  return new Set(
    getActiveSubsets(quiz, activeSubsetIds).flatMap((subset) => subset.regionIds),
  )
}

function unionBounds(boundsCollection: QuizBounds[]) {
  if (boundsCollection.length === 0) {
    return null
  }

  return boundsCollection.reduce<QuizBounds>(
    (bounds, currentBounds) => ({
      maxX: Math.max(bounds.maxX, currentBounds.maxX),
      maxY: Math.max(bounds.maxY, currentBounds.maxY),
      minX: Math.min(bounds.minX, currentBounds.minX),
      minY: Math.min(bounds.minY, currentBounds.minY),
    }),
    boundsCollection[0],
  )
}

function getBoundsForRegionIds(
  regionIds: string[],
  regionById: Record<string, QuizRegion>,
) {
  return unionBounds(
    regionIds.flatMap((regionId) =>
      regionById[regionId] ? [regionById[regionId].bounds] : [],
    ),
  )
}

function getBoundsForMapTransform(
  transform: QuizMapTransform,
  viewBox: ViewBox,
): QuizBounds {
  const clampedTransform = clampMapTransform(transform, viewBox)

  return {
    maxX: (viewBox.width - clampedTransform.x) / clampedTransform.scale,
    maxY: (viewBox.height - clampedTransform.y) / clampedTransform.scale,
    minX: -clampedTransform.x / clampedTransform.scale,
    minY: -clampedTransform.y / clampedTransform.scale,
  }
}

function getMapTransformForBounds(bounds: QuizBounds, viewBox: ViewBox) {
  const contentWidth = Math.max(1, bounds.maxX - bounds.minX)
  const contentHeight = Math.max(1, bounds.maxY - bounds.minY)
  const padding = Math.min(
    DEFAULT_SUBSET_VIEW_PADDING,
    viewBox.width * 0.08,
    viewBox.height * 0.08,
  )
  const availableWidth = Math.max(1, viewBox.width - padding * 2)
  const availableHeight = Math.max(1, viewBox.height - padding * 2)
  const scale = Math.max(
    MIN_MAP_SCALE,
    Math.min(availableWidth / contentWidth, availableHeight / contentHeight),
  )
  const x =
    padding +
    (availableWidth - contentWidth * scale) / 2 -
    bounds.minX * scale
  const y =
    padding +
    (availableHeight - contentHeight * scale) / 2 -
    bounds.minY * scale

  return clampMapTransform(
    {
      scale,
      x,
      y,
    },
    viewBox,
  )
}

export function getDefaultMapTransform(
  quiz: MapQuizDefinition,
  regionById: Record<string, QuizRegion>,
  activeSubsetIds: string[],
): MapTransform {
  const activeSubsets = getActiveSubsets(quiz, activeSubsetIds)
  if (activeSubsets.length === 0) {
    return getBaseMapTransform(quiz)
  }

  const subsetBounds = unionBounds(
    activeSubsets.flatMap((subset) => {
      if (subset.initialMapTransform) {
        return [getBoundsForMapTransform(subset.initialMapTransform, quiz.viewBox)]
      }

      const bounds = getBoundsForRegionIds(subset.viewportRegionIds, regionById)
      return bounds ? [bounds] : []
    }),
  )

  return subsetBounds
    ? getMapTransformForBounds(subsetBounds, quiz.viewBox)
    : getBaseMapTransform(quiz)
}

export function getDistance(firstPoint: MapPoint, secondPoint: MapPoint) {
  return Math.hypot(firstPoint.x - secondPoint.x, firstPoint.y - secondPoint.y)
}

export function getMidpoint(firstPoint: MapPoint, secondPoint: MapPoint) {
  return {
    x: (firstPoint.x + secondPoint.x) / 2,
    y: (firstPoint.y + secondPoint.y) / 2,
  }
}

export function buildEmptyAssignments(
  quiz: Pick<MapQuizDefinition, 'regions'>,
): AssignmentMap {
  return Object.fromEntries(quiz.regions.map((region) => [region.id, null]))
}

export function buildAnswerPlacement(assignments: AssignmentMap) {
  return Object.entries(assignments).reduce<Record<string, string>>(
    (placement, [regionId, answerId]) => {
      if (answerId) {
        placement[answerId] = regionId
      }

      return placement
    },
    {},
  )
}

export function buildQuizResults(
  activeRegions: QuizRegion[],
  assignments: AssignmentMap,
) {
  return activeRegions
    .map((region) => {
      const guessId = assignments[region.id]
      let status: ResultStatus = 'missing'

      if (guessId === region.id) {
        status = 'correct'
      } else if (guessId) {
        status = 'incorrect'
      }

      return {
        guessId,
        id: region.id,
        name: region.name,
        status,
      }
    })
    .sort((left, right) => {
      const statusOrder = {
        incorrect: 0,
        missing: 1,
        correct: 2,
      }

      return (
        statusOrder[left.status] - statusOrder[right.status] ||
        left.name.localeCompare(right.name)
      )
    })
}

export function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function normalizeText(value: string) {
  return value
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

export function getNow() {
  return Date.now()
}

export function getAnswerMatchRank(
  value: string,
  aliases: string[],
  query: string,
) {
  const normalizedQuery = normalizeText(query)
  if (!normalizedQuery) {
    return 0
  }

  const values = [value, ...aliases]
  let bestRank: number | null = null

  for (const candidate of values) {
    const normalizedCandidate = normalizeText(candidate)

    if (normalizedCandidate === normalizedQuery) {
      return 0
    }

    if (normalizedCandidate.startsWith(normalizedQuery)) {
      bestRank = bestRank === null ? 1 : Math.min(bestRank, 1)
      continue
    }

    const candidateWords = normalizedCandidate.split(/\s+/).filter(Boolean)
    if (candidateWords.some((word) => word.startsWith(normalizedQuery))) {
      bestRank = bestRank === null ? 2 : Math.min(bestRank, 2)
      continue
    }

    if (normalizedCandidate.includes(normalizedQuery)) {
      bestRank = bestRank === null ? 3 : Math.min(bestRank, 3)
    }
  }

  return bestRank
}

export function getAnswerStatus(
  answerId: string,
  answerPlacement: Record<string, string>,
  isSubmitted: boolean,
): AnswerStatus {
  const placedOnRegionId = answerPlacement[answerId]
  if (!isSubmitted) {
    return placedOnRegionId ? 'placed' : 'available'
  }

  if (!placedOnRegionId) {
    return 'missing'
  }

  return placedOnRegionId === answerId ? 'correct' : 'misplaced'
}

export function getAnswerStateLabel(
  answerId: string,
  answerPlacement: Record<string, string>,
  isSubmitted: boolean,
  selectedAnswerId: string | null,
): AnswerStateLabel {
  if (!isSubmitted && selectedAnswerId === answerId) {
    return 'selected'
  }

  return getAnswerStatus(answerId, answerPlacement, isSubmitted)
}

export function getRegionStatus(
  regionId: string,
  activeRegionIdSet: Set<string>,
  assignments: AssignmentMap,
  isSubmitted: boolean,
): RegionStatus {
  if (!activeRegionIdSet.has(regionId)) {
    return 'inactive'
  }

  const guessId = assignments[regionId]
  if (!isSubmitted) {
    return guessId ? 'assigned' : 'idle'
  }

  if (guessId === regionId) {
    return 'correct'
  }

  return guessId ? 'incorrect' : 'missing'
}

export function estimateLabelWidth(text: string, fontSize: number) {
  return text.length * fontSize * 0.58
}

function getDynamicMaxRegionLabelFontSize(mapScale: number) {
  return clamp(
    BASE_MAX_REGION_LABEL_FONT_SIZE / Math.max(mapScale, 1),
    MIN_REGION_LABEL_FONT_SIZE + 0.4,
    MAX_REGION_LABEL_FONT_SIZE,
  )
}

function getDynamicMapStrokeWidth(baseWidth: number, mapScale: number) {
  return clamp(baseWidth / Math.max(mapScale, 1), 0.45, baseWidth)
}

export function getMapStrokeWidth(
  mapScale: number,
  options?: { isPreviewSelected?: boolean; isResultSelected?: boolean },
) {
  if (options?.isResultSelected) {
    return getDynamicMapStrokeWidth(3.25, mapScale)
  }

  if (options?.isPreviewSelected) {
    return getDynamicMapStrokeWidth(2.8, mapScale)
  }

  return getDynamicMapStrokeWidth(1.4, mapScale)
}

export function getLabelTextStrokeWidth(fontSize: number) {
  return Math.max(0.7, fontSize * 0.16)
}

export function getLabelBadgeStrokeWidth(fontSize: number) {
  return Math.max(0.9, fontSize * 0.11)
}

export function transformMapPoint(point: MapPoint, transform: MapTransform) {
  return {
    x: point.x * transform.scale + transform.x,
    y: point.y * transform.scale + transform.y,
  }
}

function getRegionLabelCandidates(region: QuizRegion) {
  return [
    region.name,
    ...region.aliases
      .filter((alias) => alias !== region.name)
      .sort((left, right) => right.length - left.length),
  ]
}

export function getRegionOverlayLabel(
  region: QuizRegion,
  assignedRegion: QuizRegion | null,
  isSelected: boolean,
  mapScale: number,
): RegionOverlayLabel | null {
  if (!assignedRegion) {
    return null
  }

  const scaledWidth = region.labelBounds.width * mapScale
  const scaledHeight = region.labelBounds.height * mapScale
  const availableWidth = Math.max(0, scaledWidth - (isSelected ? 16 : 12))
  const availableHeight = Math.max(0, scaledHeight - (isSelected ? 12 : 8))

  if (availableWidth < 18 || availableHeight < 10) {
    return null
  }

  const maxFontSize = getDynamicMaxRegionLabelFontSize(mapScale)

  for (const candidate of getRegionLabelCandidates(assignedRegion)) {
    const fontSize = Math.min(
      maxFontSize,
      availableHeight * (isSelected ? 0.56 : 0.48),
      availableWidth / Math.max(candidate.length * 0.62, 1),
    )

    if (fontSize >= MIN_REGION_LABEL_FONT_SIZE) {
      return {
        fontSize,
        text: candidate,
      }
    }
  }

  return null
}

export function getSmallRegionMarker(
  region: QuizRegion,
  isSelected: boolean,
  mapScale: number,
): SmallRegionMarker | null {
  const scaledWidth = region.labelBounds.width * mapScale
  const scaledHeight = region.labelBounds.height * mapScale
  const maxDimension = Math.max(scaledWidth, scaledHeight)
  const minDimension = Math.min(scaledWidth, scaledHeight)

  if (
    maxDimension > SMALL_REGION_MARKER_MAX_DIMENSION &&
    !(
      minDimension <= SMALL_REGION_MARKER_THIN_DIMENSION &&
      maxDimension <= SMALL_REGION_MARKER_THIN_MAX_DIMENSION
    )
  ) {
    return null
  }

  const sizeFactor = clamp(maxDimension / SMALL_REGION_MARKER_MAX_DIMENSION, 0.3, 1)
  const dotRadius = clamp(
    SMALL_REGION_MARKER_MIN_DOT_RADIUS +
      (SMALL_REGION_MARKER_MAX_DOT_RADIUS - SMALL_REGION_MARKER_MIN_DOT_RADIUS) *
        sizeFactor,
    SMALL_REGION_MARKER_MIN_DOT_RADIUS,
    SMALL_REGION_MARKER_MAX_DOT_RADIUS + (isSelected ? 0.4 : 0),
  )

  return {
    dotRadius,
    hitRadius: Math.max(dotRadius + 5.1, SMALL_REGION_MARKER_MIN_HIT_RADIUS),
    ringRadius: dotRadius + (isSelected ? 3.4 : 2.4),
  }
}
