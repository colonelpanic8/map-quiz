import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import clsx from 'clsx'
import { defaultQuizId, quizzes } from './data/quizzes.ts'
import type { QuizRegion } from './lib/quiz-builder.ts'

type AssignmentMap = Record<string, string | null>

type ResultStatus = 'correct' | 'incorrect' | 'missing'
type MapTransform = { scale: number; x: number; y: number }
type MapPoint = { x: number; y: number }
type TrackedPointer = MapPoint & { clientX: number; clientY: number }
type SelectionMenuState = {
  left: number
  maxHeight: number
  top: number
  width: number
}
type DragGesture = {
  pointerId: number
  startClientX: number
  startClientY: number
  startPoint: MapPoint
  startTransform: MapTransform
}
type PinchGesture = { distance: number; midpoint: MapPoint }

const MIN_MAP_SCALE = 1
const MAX_MAP_SCALE = 6
const MAP_ZOOM_BUTTON_STEP = 1.25
const DRAG_SUPPRESSION_DISTANCE = 8
const MAP_SELECTION_MENU_MARGIN = 12
const MAP_SELECTION_MENU_MAX_WIDTH = 320
const MAP_SELECTION_MENU_MAX_HEIGHT = 360
const MAP_SELECTION_MENU_RESERVED_HEIGHT = 132
const MAP_SELECTION_MENU_ROW_HEIGHT = 46
const MIN_REGION_LABEL_FONT_SIZE = 7.5
const MAX_REGION_LABEL_FONT_SIZE = 17

type RegionOverlayLabel = {
  fontSize: number
  text: string
}

function createDefaultMapTransform(): MapTransform {
  return { scale: 1, x: 0, y: 0 }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum)
}

function clampMapTransform(
  transform: MapTransform,
  viewBox: { height: number; width: number },
) {
  const nextScale = clamp(transform.scale, MIN_MAP_SCALE, MAX_MAP_SCALE)
  const minX = viewBox.width * (1 - nextScale)
  const minY = viewBox.height * (1 - nextScale)

  return {
    scale: nextScale,
    x: clamp(transform.x, minX, 0),
    y: clamp(transform.y, minY, 0),
  }
}

function zoomMapTransform(
  transform: MapTransform,
  nextScale: number,
  anchor: MapPoint,
  viewBox: { height: number; width: number },
) {
  const clampedScale = clamp(nextScale, MIN_MAP_SCALE, MAX_MAP_SCALE)
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

function getDistance(firstPoint: MapPoint, secondPoint: MapPoint) {
  return Math.hypot(firstPoint.x - secondPoint.x, firstPoint.y - secondPoint.y)
}

function getMidpoint(firstPoint: MapPoint, secondPoint: MapPoint) {
  return {
    x: (firstPoint.x + secondPoint.x) / 2,
    y: (firstPoint.y + secondPoint.y) / 2,
  }
}

function buildEmptyAssignments(quizId: string) {
  const quiz = quizzes.find((entry) => entry.id === quizId) ?? quizzes[0]
  return Object.fromEntries(quiz.regions.map((region) => [region.id, null]))
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, ' ')
    .trim()
}

function getNow() {
  return Date.now()
}

function getAnswerMatchRank(value: string, aliases: string[], query: string) {
  const normalizedQuery = normalizeText(query)
  if (!normalizedQuery) {
    return 0
  }

  let bestRank: number | null = null

  for (const [index, candidate] of [value, ...aliases].entries()) {
    const normalizedCandidate = normalizeText(candidate)
    const exactRankBase = index === 0 ? 0 : 1
    const prefixRankBase = index === 0 ? 2 : 3
    const wordPrefixRankBase = index === 0 ? 4 : 5
    const substringRankBase = index === 0 ? 6 : 7

    if (normalizedCandidate === normalizedQuery) {
      bestRank = bestRank === null ? exactRankBase : Math.min(bestRank, exactRankBase)
      continue
    }

    if (normalizedCandidate.startsWith(normalizedQuery)) {
      bestRank =
        bestRank === null ? prefixRankBase : Math.min(bestRank, prefixRankBase)
      continue
    }

    if (
      normalizedCandidate
        .split(' ')
        .some((word) => word.startsWith(normalizedQuery))
    ) {
      bestRank =
        bestRank === null
          ? wordPrefixRankBase
          : Math.min(bestRank, wordPrefixRankBase)
      continue
    }

    if (normalizedCandidate.includes(normalizedQuery)) {
      bestRank =
        bestRank === null
          ? substringRankBase
          : Math.min(bestRank, substringRankBase)
    }
  }

  return bestRank
}

function estimateLabelWidth(text: string, fontSize: number) {
  return text.length * fontSize * 0.58
}

function getRegionLabelCandidates(region: QuizRegion) {
  return [
    region.name,
    ...region.aliases
      .filter((alias) => alias !== region.name)
      .sort((left, right) => right.length - left.length),
  ]
}

function getRegionOverlayLabel(
  region: QuizRegion,
  assignedRegion: QuizRegion | null,
  isSelected: boolean,
): RegionOverlayLabel | null {
  if (!assignedRegion) {
    return null
  }

  const availableWidth = Math.max(
    0,
    region.labelBounds.width - (isSelected ? 14 : 10),
  )
  const availableHeight = Math.max(
    0,
    region.labelBounds.height - (isSelected ? 10 : 6),
  )

  if (availableWidth < 18 || availableHeight < 10) {
    return null
  }

  for (const candidate of getRegionLabelCandidates(assignedRegion)) {
    const fontSize = Math.min(
      MAX_REGION_LABEL_FONT_SIZE,
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

function App() {
  const [quizId, setQuizId] = useState(defaultQuizId)
  const [assignments, setAssignments] = useState<AssignmentMap>(() =>
    buildEmptyAssignments(defaultQuizId),
  )
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null)
  const [bankQuery, setBankQuery] = useState('')
  const [pickerQuery, setPickerQuery] = useState('')
  const [isTimerDisabled, setIsTimerDisabled] = useState(false)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [submittedAt, setSubmittedAt] = useState<number | null>(null)
  const [clockNow, setClockNow] = useState(() => Date.now())
  const [countedElapsedMs, setCountedElapsedMs] = useState(0)
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null)
  const [isMapDragging, setIsMapDragging] = useState(false)
  const [mapTransform, setMapTransform] = useState<MapTransform>(() =>
    createDefaultMapTransform(),
  )
  const [selectionMenu, setSelectionMenu] = useState<SelectionMenuState | null>(
    null,
  )
  const mapSvgRef = useRef<SVGSVGElement | null>(null)
  const activePointersRef = useRef<Map<number, TrackedPointer>>(new Map())
  const dragGestureRef = useRef<DragGesture | null>(null)
  const pinchGestureRef = useRef<PinchGesture | null>(null)
  const multiTouchGestureRef = useRef(false)
  const suppressRegionClickRef = useRef(false)
  const suppressRegionClickTimeoutRef = useRef<number | null>(null)

  const quiz = quizzes.find((entry) => entry.id === quizId) ?? quizzes[0]
  const regionById = Object.fromEntries(
    quiz.regions.map((region) => [region.id, region]),
  )

  const countdownNow = submittedAt ?? clockNow
  const elapsedCountdownMs =
    countedElapsedMs +
    (timerStartedAt !== null ? Math.max(0, countdownNow - timerStartedAt) : 0)
  const elapsedSeconds = Math.max(0, Math.floor(elapsedCountdownMs / 1000))
  const timerIsActive = !isTimerDisabled
  const remainingSeconds = timerIsActive
    ? Math.max(0, quiz.timeLimitSeconds - elapsedSeconds)
    : null
  const assignedCount = Object.values(assignments).filter(Boolean).length
  const isSubmitted =
    submittedAt !== null ||
    (startedAt !== null && timerIsActive && remainingSeconds === 0)

  useEffect(() => {
    if (timerStartedAt === null || isSubmitted) {
      return
    }

    const intervalId = window.setInterval(() => {
      setClockNow(Date.now())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [isSubmitted, timerStartedAt])

  useEffect(() => {
    return () => {
      if (suppressRegionClickTimeoutRef.current !== null) {
        window.clearTimeout(suppressRegionClickTimeoutRef.current)
      }
    }
  }, [])

  const answerPlacement = Object.entries(assignments).reduce<
    Record<string, string>
  >((placement, [regionId, answerId]) => {
    if (answerId) {
      placement[answerId] = regionId
    }

    return placement
  }, {})

  const results = quiz.regions
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

  const correctCount = results.filter(
    (result) => result.status === 'correct',
  ).length
  const incorrectCount = results.filter(
    (result) => result.status === 'incorrect',
  ).length
  const missingCount = results.filter(
    (result) => result.status === 'missing',
  ).length

  function getMatchingAnswers(query: string) {
    return quiz.regions
      .map((region) => ({
        matchRank: getAnswerMatchRank(region.name, region.aliases, query),
        region,
      }))
      .filter(({ matchRank, region }) => {
        if (!isSubmitted && answerPlacement[region.id]) {
          return false
        }

        return matchRank !== null
      })
      .sort((left, right) => {
        const leftRank = left.matchRank ?? Number.POSITIVE_INFINITY
        const rightRank = right.matchRank ?? Number.POSITIVE_INFINITY

        return (
          leftRank - rightRank ||
          left.region.name.localeCompare(right.region.name)
        )
      })
      .map(({ region }) => region)
  }

  const visibleAnswers = getMatchingAnswers(bankQuery)
  const pickerMatches = getMatchingAnswers(pickerQuery)
  const quickPickerVisibleCount = selectionMenu
    ? Math.max(
        1,
        Math.floor(
          (selectionMenu.maxHeight - MAP_SELECTION_MENU_RESERVED_HEIGHT) /
            MAP_SELECTION_MENU_ROW_HEIGHT,
        ),
      )
    : 10
  const quickPickerAnswers = pickerMatches.slice(0, quickPickerVisibleCount)
  const hiddenQuickPickerCount = Math.max(
    0,
    pickerMatches.length - quickPickerAnswers.length,
  )

  const selectedRegionGuessId = selectedRegionId
    ? assignments[selectedRegionId]
    : null
  const selectedRegionGuess = selectedRegionGuessId
    ? regionById[selectedRegionGuessId]
    : null
  const mapIsReset =
    mapTransform.scale === MIN_MAP_SCALE &&
    mapTransform.x === 0 &&
    mapTransform.y === 0

  function clearMapGestures() {
    activePointersRef.current.clear()
    dragGestureRef.current = null
    pinchGestureRef.current = null
    multiTouchGestureRef.current = false
    suppressRegionClickRef.current = false
    if (suppressRegionClickTimeoutRef.current !== null) {
      window.clearTimeout(suppressRegionClickTimeoutRef.current)
      suppressRegionClickTimeoutRef.current = null
    }
    setIsMapDragging(false)
  }

  function closeSelectionMenu(options?: { clearBlankSelection?: boolean }) {
    setSelectionMenu(null)
    setPickerQuery('')

    if (
      options?.clearBlankSelection &&
      selectedRegionId &&
      !assignments[selectedRegionId]
    ) {
      setSelectedRegionId(null)
    }
  }

  function getSelectionMenu(clientX: number, clientY: number) {
    if (typeof window === 'undefined') {
      return null
    }

    // The quick picker is rendered as a fixed overlay so it stays visually stable
    // while the page scrolls and while the map itself pans/zooms underneath it.
    // That means its anchor math needs to stay in viewport coordinates rather than
    // map-local coordinates.
    const menuWidth = Math.min(
      MAP_SELECTION_MENU_MAX_WIDTH,
      Math.max(0, window.innerWidth - MAP_SELECTION_MENU_MARGIN * 2),
    )
    const menuHeight = Math.min(
      MAP_SELECTION_MENU_MAX_HEIGHT,
      Math.max(0, window.innerHeight - MAP_SELECTION_MENU_MARGIN * 2),
    )
    const maxLeft = Math.max(
      MAP_SELECTION_MENU_MARGIN,
      window.innerWidth - menuWidth - MAP_SELECTION_MENU_MARGIN,
    )
    const maxTop = Math.max(
      MAP_SELECTION_MENU_MARGIN,
      window.innerHeight - menuHeight - MAP_SELECTION_MENU_MARGIN,
    )
    const preferredTop =
      clientY > window.innerHeight * 0.55
        ? clientY - menuHeight - MAP_SELECTION_MENU_MARGIN
        : clientY + MAP_SELECTION_MENU_MARGIN

    return {
      left: clamp(
        clientX - menuWidth / 2,
        MAP_SELECTION_MENU_MARGIN,
        maxLeft,
      ),
      maxHeight: menuHeight,
      top: clamp(preferredTop, MAP_SELECTION_MENU_MARGIN, maxTop),
      width: menuWidth,
    }
  }

  function openSelectionMenu(clientX: number, clientY: number) {
    setPickerQuery('')
    setSelectionMenu(getSelectionMenu(clientX, clientY))
  }

  function getMapPoint(clientX: number, clientY: number) {
    const mapSvg = mapSvgRef.current
    if (!mapSvg) {
      return null
    }

    const boundingRect = mapSvg.getBoundingClientRect()
    if (!boundingRect.width || !boundingRect.height) {
      return null
    }

    return {
      x: ((clientX - boundingRect.left) / boundingRect.width) * quiz.viewBox.width,
      y:
        ((clientY - boundingRect.top) / boundingRect.height) * quiz.viewBox.height,
    }
  }

  function suppressRegionClickForMoment() {
    suppressRegionClickRef.current = true

    if (suppressRegionClickTimeoutRef.current !== null) {
      window.clearTimeout(suppressRegionClickTimeoutRef.current)
    }

    suppressRegionClickTimeoutRef.current = window.setTimeout(() => {
      suppressRegionClickRef.current = false
      suppressRegionClickTimeoutRef.current = null
    }, 250)
  }

  function resetMapZoom() {
    clearMapGestures()
    setMapTransform(createDefaultMapTransform())
  }

  function getRegionIdAtClientPoint(clientX: number, clientY: number) {
    const mapSvg = mapSvgRef.current
    if (!mapSvg) {
      return null
    }

    // Region activation is resolved from the svg on pointer-up instead of relying
    // on each path's native click event. Pointer capture, drag suppression, and
    // label overlays make per-path click delivery inconsistent, while hit-testing
    // the viewport point is stable across those interaction modes.
    for (const element of mapSvg.ownerDocument.elementsFromPoint(clientX, clientY)) {
      const regionElement = element.closest('[data-region-id]')
      const regionId = regionElement?.getAttribute('data-region-id')

      if (regionId) {
        return regionId
      }
    }

    return null
  }

  function nudgeMapZoom(scaleDelta: number, anchor?: MapPoint) {
    const zoomAnchor = anchor ?? {
      x: quiz.viewBox.width / 2,
      y: quiz.viewBox.height / 2,
    }

    setMapTransform((currentTransform) =>
      zoomMapTransform(
        currentTransform,
        currentTransform.scale * scaleDelta,
        zoomAnchor,
        quiz.viewBox,
      ),
    )
  }

  function handleMapWheel(event: ReactWheelEvent<SVGSVGElement>) {
    const anchor = getMapPoint(event.clientX, event.clientY)
    if (!anchor) {
      return
    }

    closeSelectionMenu({ clearBlankSelection: true })
    event.preventDefault()
    const scaleDelta = Math.exp(-event.deltaY * 0.0025)

    setMapTransform((currentTransform) =>
      zoomMapTransform(
        currentTransform,
        currentTransform.scale * scaleDelta,
        anchor,
        quiz.viewBox,
      ),
    )
  }

  function handleMapPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return
    }

    const point = getMapPoint(event.clientX, event.clientY)
    if (!point) {
      return
    }

    closeSelectionMenu({ clearBlankSelection: true })
    activePointersRef.current.set(event.pointerId, {
      ...point,
      clientX: event.clientX,
      clientY: event.clientY,
    })

    if (activePointersRef.current.size >= 2) {
      multiTouchGestureRef.current = true
      const [firstPointer, secondPointer] = Array.from(
        activePointersRef.current.values(),
      )

      pinchGestureRef.current = {
        distance: getDistance(firstPointer, secondPointer),
        midpoint: getMidpoint(firstPointer, secondPointer),
      }
      dragGestureRef.current = null
      setIsMapDragging(false)
    } else if (mapTransform.scale > MIN_MAP_SCALE) {
      dragGestureRef.current = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPoint: point,
        startTransform: mapTransform,
      }
    }

    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleMapPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const point = getMapPoint(event.clientX, event.clientY)
    if (!point) {
      return
    }

    activePointersRef.current.set(event.pointerId, {
      ...point,
      clientX: event.clientX,
      clientY: event.clientY,
    })

    if (activePointersRef.current.size >= 2) {
      const [firstPointer, secondPointer] = Array.from(
        activePointersRef.current.values(),
      )
      const nextMidpoint = getMidpoint(firstPointer, secondPointer)
      const nextDistance = getDistance(firstPointer, secondPointer)
      const pinchGesture = pinchGestureRef.current

      if (pinchGesture && pinchGesture.distance > 0) {
        setMapTransform((currentTransform) => {
          const zoomedTransform = zoomMapTransform(
            currentTransform,
            currentTransform.scale * (nextDistance / pinchGesture.distance),
            pinchGesture.midpoint,
            quiz.viewBox,
          )

          return clampMapTransform(
            {
              ...zoomedTransform,
              x: zoomedTransform.x + (nextMidpoint.x - pinchGesture.midpoint.x),
              y: zoomedTransform.y + (nextMidpoint.y - pinchGesture.midpoint.y),
            },
            quiz.viewBox,
          )
        })
      }

      pinchGestureRef.current = {
        distance: nextDistance,
        midpoint: nextMidpoint,
      }
      suppressRegionClickForMoment()
      dragGestureRef.current = null
      setIsMapDragging(false)
      event.preventDefault()
      return
    }

    const dragGesture = dragGestureRef.current
    if (
      dragGesture &&
      dragGesture.pointerId === event.pointerId &&
      mapTransform.scale > MIN_MAP_SCALE
    ) {
      const movedDistance = Math.hypot(
        event.clientX - dragGesture.startClientX,
        event.clientY - dragGesture.startClientY,
      )

      if (movedDistance > DRAG_SUPPRESSION_DISTANCE) {
        suppressRegionClickForMoment()
        setIsMapDragging(true)
      }

      if (movedDistance <= DRAG_SUPPRESSION_DISTANCE) {
        return
      }

      setMapTransform(
        clampMapTransform(
          {
            scale: dragGesture.startTransform.scale,
            x: dragGesture.startTransform.x + (point.x - dragGesture.startPoint.x),
            y: dragGesture.startTransform.y + (point.y - dragGesture.startPoint.y),
          },
          quiz.viewBox,
        ),
      )
      event.preventDefault()
    }
  }

  function finishMapPointerGesture(pointerId: number, currentTarget: SVGSVGElement) {
    activePointersRef.current.delete(pointerId)

    if (currentTarget.hasPointerCapture(pointerId)) {
      currentTarget.releasePointerCapture(pointerId)
    }

    if (activePointersRef.current.size < 2) {
      pinchGestureRef.current = null
    }

    if (dragGestureRef.current?.pointerId === pointerId) {
      dragGestureRef.current = null
    }

    setIsMapDragging(false)

    if (activePointersRef.current.size === 1 && mapTransform.scale > MIN_MAP_SCALE) {
      const [nextPointerId, nextPointer] = Array.from(
        activePointersRef.current.entries(),
      )[0]

      dragGestureRef.current = {
        pointerId: nextPointerId,
        startClientX: nextPointer.clientX,
        startClientY: nextPointer.clientY,
        startPoint: { x: nextPointer.x, y: nextPointer.y },
        startTransform: mapTransform,
      }
    } else if (activePointersRef.current.size === 0) {
      multiTouchGestureRef.current = false
    }
  }

  function handleMapPointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    // Only treat the gesture as a region tap when it finished as a single-pointer
    // interaction without crossing into drag/pinch suppression.
    const regionId =
      !suppressRegionClickRef.current &&
      !multiTouchGestureRef.current &&
      activePointersRef.current.size === 1
        ? getRegionIdAtClientPoint(event.clientX, event.clientY)
        : null

    finishMapPointerGesture(event.pointerId, event.currentTarget)

    if (regionId) {
      handleRegionClick(regionId, event)
    }
  }

  function handleMapPointerCancel(event: ReactPointerEvent<SVGSVGElement>) {
    finishMapPointerGesture(event.pointerId, event.currentTarget)
  }

  function resetQuizState(nextQuizId: string) {
    setAssignments(buildEmptyAssignments(nextQuizId))
    setSelectedAnswerId(null)
    setSelectedRegionId(null)
    setBankQuery('')
    closeSelectionMenu()
    setStartedAt(null)
    setSubmittedAt(null)
    setCountedElapsedMs(0)
    setTimerStartedAt(null)
    setClockNow(getNow())
    resetMapZoom()
  }

  function ensureStarted(now?: number) {
    const nextNow = now ?? getNow()

    setStartedAt((currentValue) => currentValue ?? nextNow)
    if (timerIsActive) {
      setTimerStartedAt((currentValue) => currentValue ?? nextNow)
    }
    setClockNow(nextNow)
  }

  function handleTimerDisabledChange(event: ChangeEvent<HTMLInputElement>) {
    const nextIsTimerDisabled = event.target.checked
    const now = getNow()

    setIsTimerDisabled(nextIsTimerDisabled)
    setClockNow(now)

    if (!startedAt || isSubmitted) {
      return
    }

    if (nextIsTimerDisabled) {
      if (timerStartedAt !== null) {
        setCountedElapsedMs((currentValue) => currentValue + (now - timerStartedAt))
        setTimerStartedAt(null)
      }
      return
    }

    setTimerStartedAt((currentValue) => currentValue ?? now)
  }

  function assignAnswerToRegion(regionId: string, answerId: string) {
    ensureStarted()
    setAssignments((currentAssignments) => {
      const nextAssignments = { ...currentAssignments }

      for (const currentRegionId of Object.keys(nextAssignments)) {
        if (nextAssignments[currentRegionId] === answerId) {
          nextAssignments[currentRegionId] = null
        }
      }

      nextAssignments[regionId] = answerId
      return nextAssignments
    })
    setSelectedRegionId(regionId)
    setSelectedAnswerId(null)
    closeSelectionMenu()
  }

  function handleRegionClick(
    regionId: string,
    event?: Pick<ReactPointerEvent<SVGSVGElement> | ReactMouseEvent<SVGPathElement>, 'clientX' | 'clientY'>,
  ) {
    if (suppressRegionClickRef.current) {
      return
    }

    if (isSubmitted) {
      closeSelectionMenu()
      setSelectedRegionId((currentRegionId) =>
        currentRegionId === regionId ? null : regionId,
      )
      return
    }

    ensureStarted()
    if (selectedAnswerId) {
      assignAnswerToRegion(regionId, selectedAnswerId)
      return
    }

    const nextRegionId = selectedRegionId === regionId ? null : regionId
    setSelectedRegionId(nextRegionId)

    if (!nextRegionId || !event) {
      closeSelectionMenu()
      return
    }

    openSelectionMenu(event.clientX, event.clientY)
  }

  function handleAnswerClick(answerId: string) {
    if (isSubmitted) {
      return
    }

    ensureStarted()
    if (selectedRegionId) {
      assignAnswerToRegion(selectedRegionId, answerId)
      return
    }

    closeSelectionMenu()
    setSelectedAnswerId((currentAnswerId) =>
      currentAnswerId === answerId ? null : answerId,
    )
  }

  function handleGradeMap() {
    const now = getNow()

    ensureStarted(now)
    if (timerStartedAt !== null) {
      setCountedElapsedMs((currentValue) => currentValue + (now - timerStartedAt))
      setTimerStartedAt(null)
    }
    closeSelectionMenu()
    setSubmittedAt(now)
  }

  function handleReset() {
    resetQuizState(quiz.id)
  }

  function clearSelectedRegion() {
    if (!selectedRegionId || isSubmitted) {
      return
    }

    setAssignments((currentAssignments) => ({
      ...currentAssignments,
      [selectedRegionId]: null,
    }))
    setSelectedRegionId(null)
    closeSelectionMenu()
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedRegionId || isSubmitted) {
      return
    }

    const [firstMatch] = visibleAnswers
    if (!firstMatch) {
      return
    }

    assignAnswerToRegion(selectedRegionId, firstMatch.id)
  }

  function handlePickerSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedRegionId || isSubmitted) {
      return
    }

    const [firstMatch] = pickerMatches
    if (!firstMatch) {
      return
    }

    assignAnswerToRegion(selectedRegionId, firstMatch.id)
  }

  function handleQuizChange(nextQuizId: string) {
    setQuizId(nextQuizId)
    resetQuizState(nextQuizId)
  }

  function getAnswerStatus(answerId: string) {
    const placedOnRegionId = answerPlacement[answerId]
    if (!isSubmitted) {
      return placedOnRegionId ? 'placed' : 'available'
    }

    if (!placedOnRegionId) {
      return 'missing'
    }

    return placedOnRegionId === answerId ? 'correct' : 'misplaced'
  }

  function getRegionStatus(regionId: string) {
    const guessId = assignments[regionId]
    if (!isSubmitted) {
      return guessId ? 'assigned' : 'idle'
    }

    if (guessId === regionId) {
      return 'correct'
    }

    return guessId ? 'incorrect' : 'missing'
  }

  function getAnswerStateLabel(answerId: string) {
    if (!isSubmitted && selectedAnswerId === answerId) {
      return 'selected'
    }

    return getAnswerStatus(answerId)
  }

  const selectionSummary = (() => {
    if (!isSubmitted && selectedAnswerId) {
      return `${regionById[selectedAnswerId].name} is selected. Click a region to place it.`
    }

    if (!isSubmitted && selectedRegionId) {
      return selectedRegionGuess
        ? `Region selected • current label: ${selectedRegionGuess.name}`
        : 'Region selected • blank'
    }

    if (isSubmitted && selectedRegionId) {
      return `${regionById[selectedRegionId].name}${
        selectedRegionGuess ? ` • your label: ${selectedRegionGuess.name}` : ' • blank'
      }`
    }

    return isSubmitted
      ? 'Click a region to inspect it after grading.'
      : 'Click a region to open the picker, or choose a label from the bank.'
  })()

  return (
    <div className="app-shell">
      <main className="workspace">
        <section className="panel map-panel">
          <div className="panel-header">
            <div>
              <h2>{quiz.title}</h2>
              <p className="panel-copy">{quiz.prompt}</p>
            </div>
            <div className="panel-actions">
              <button className="button secondary" onClick={handleReset}>
                Reset
              </button>
              <button className="button" onClick={handleGradeMap}>
                Grade Map
              </button>
            </div>
          </div>

          <div
            className="map-stage"
            style={{
              aspectRatio: `${quiz.viewBox.width}/${quiz.viewBox.height}`,
            }}
          >
            <div className="map-zoom-controls" role="group" aria-label="Map zoom controls">
              <span className="map-zoom-readout">{mapTransform.scale.toFixed(1)}x</span>
              <button
                type="button"
                className="map-zoom-button"
                onClick={() => nudgeMapZoom(MAP_ZOOM_BUTTON_STEP)}
                aria-label="Zoom in"
              >
                +
              </button>
              <button
                type="button"
                className="map-zoom-button"
                onClick={() => nudgeMapZoom(1 / MAP_ZOOM_BUTTON_STEP)}
                aria-label="Zoom out"
                disabled={mapTransform.scale <= MIN_MAP_SCALE}
              >
                -
              </button>
              <button
                type="button"
                className="map-zoom-reset"
                onClick={resetMapZoom}
                disabled={mapIsReset}
              >
                Reset view
              </button>
            </div>
            <svg
              ref={mapSvgRef}
              className={clsx('quiz-map', {
                'is-dragging': isMapDragging,
                'is-pannable': mapTransform.scale > MIN_MAP_SCALE,
              })}
              viewBox={`0 0 ${quiz.viewBox.width} ${quiz.viewBox.height}`}
              role="img"
              aria-label={quiz.title}
              onPointerCancel={handleMapPointerCancel}
              onPointerDown={handleMapPointerDown}
              onPointerMove={handleMapPointerMove}
              onPointerUp={handleMapPointerUp}
              onWheel={handleMapWheel}
            >
              <rect
                x="0"
                y="0"
                width={quiz.viewBox.width}
                height={quiz.viewBox.height}
                className="map-water"
              />
              <g
                transform={`translate(${mapTransform.x} ${mapTransform.y}) scale(${mapTransform.scale})`}
              >
                {quiz.regions.map((region) => {
                  const guessId = assignments[region.id]
                  const guessName = guessId ? regionById[guessId].name : null
                  const regionStatus = getRegionStatus(region.id)
                  const isSelectedRegion = selectedRegionId === region.id
                  const overlayLabel = getRegionOverlayLabel(
                    region,
                    guessId ? regionById[guessId] : null,
                    isSelectedRegion,
                  )

                  return (
                    <g key={region.id} className="map-region-layer">
                      <path
                      data-region-id={region.id}
                      d={region.path}
                      className={clsx('map-region', `status-${regionStatus}`, {
                        'is-preview-selected': !isSubmitted && isSelectedRegion,
                        'is-result-selected': isSubmitted && isSelectedRegion,
                      })}
                    >
                        <title>
                          {isSubmitted
                            ? `${region.name}${
                                guessName ? ` • your label: ${guessName}` : ' • blank'
                              }`
                            : guessName
                              ? `Placed label: ${guessName}`
                              : 'Unassigned region'}
                        </title>
                      </path>

                      {overlayLabel ? (
                        <g
                          className={clsx(
                            'map-region-label',
                            `status-${regionStatus}`,
                            {
                              'is-selected': isSelectedRegion,
                            },
                          )}
                          transform={`translate(${region.labelPosition.x} ${region.labelPosition.y})`}
                        >
                          {isSelectedRegion ? (
                            <rect
                              x={-(estimateLabelWidth(
                                overlayLabel.text,
                                overlayLabel.fontSize,
                              ) / 2 + 7)}
                              y={-(overlayLabel.fontSize * 0.85)}
                              width={
                                estimateLabelWidth(
                                  overlayLabel.text,
                                  overlayLabel.fontSize,
                                ) + 14
                              }
                              height={overlayLabel.fontSize * 1.45}
                              rx={overlayLabel.fontSize * 0.45}
                              ry={overlayLabel.fontSize * 0.45}
                            />
                          ) : null}
                          <text
                            style={{
                              fontSize: `${overlayLabel.fontSize}px`,
                            }}
                          >
                            {overlayLabel.text}
                          </text>
                        </g>
                      ) : null}
                    </g>
                  )
                })}
              </g>
            </svg>

            {!isSubmitted && selectedRegionId && selectionMenu ? (
              <section
                className="map-selection-menu"
                style={{
                  left: selectionMenu.left,
                  maxHeight: selectionMenu.maxHeight,
                  top: selectionMenu.top,
                  width: selectionMenu.width,
                }}
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <div className="map-selection-header">
                  <div className="map-selection-title">
                    <span className="selection-callout-label">Quick picker</span>
                    <strong>{regionById[selectedRegionId].name}</strong>
                    <span className="map-selection-subtitle">
                      {selectedRegionGuess
                        ? `Current: ${selectedRegionGuess.name}`
                        : 'Blank region'}
                    </span>
                  </div>
                  <div className="map-selection-actions">
                    {selectedRegionGuess ? (
                      <button
                        type="button"
                        className="map-selection-dismiss"
                        onClick={clearSelectedRegion}
                      >
                        Clear
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="map-selection-dismiss"
                      onClick={() =>
                        closeSelectionMenu({ clearBlankSelection: true })
                      }
                      aria-label="Close quick picker"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <form
                  className="map-selection-search"
                  onSubmit={handlePickerSearchSubmit}
                >
                  <input
                    name="map-answer-search"
                    type="search"
                    value={pickerQuery}
                    onChange={(event) => setPickerQuery(event.target.value)}
                    placeholder="Search labels or aliases"
                    autoFocus
                  />
                </form>

                <p className="map-selection-note">
                  {quickPickerAnswers.length > 0
                    ? 'Enter assigns the first match.'
                    : 'No visible labels match this filter.'}
                </p>

                <div className="map-selection-list">
                  {quickPickerAnswers.map((answer) => {
                    const answerStatus = getAnswerStatus(answer.id)
                    const answerStateLabel = getAnswerStateLabel(answer.id)

                    return (
                      <button
                        key={answer.id}
                        type="button"
                        className={clsx(
                          'answer-chip',
                          'compact',
                          `answer-${answerStatus}`,
                          {
                            'is-selected': selectedAnswerId === answer.id,
                          },
                        )}
                        onClick={() => handleAnswerClick(answer.id)}
                      >
                        <span>{answer.name}</span>
                        <span className="answer-state">{answerStateLabel}</span>
                      </button>
                    )
                  })}

                  {hiddenQuickPickerCount > 0 ? (
                    <p className="map-selection-note">
                      Showing the first {quickPickerAnswers.length} candidates that
                      fit on screen.
                    </p>
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>

          <p className="map-hint">
            Click a region to open the local picker. Scroll or pinch to zoom, then
            drag once you’re zoomed in.
          </p>

          <div className="map-selection-summary" aria-live="polite">
            <span>{selectionSummary}</span>
            {!isSubmitted && selectedRegionId ? (
              <button
                className="button ghost map-selection-summary-action"
                onClick={clearSelectedRegion}
              >
                Clear
              </button>
            ) : null}
          </div>

          <div className="legend-row">
            <span className="legend-chip preview">Preview</span>
            <span className="legend-chip idle">Empty</span>
            <span className="legend-chip assigned">Placed</span>
            <span className="legend-chip correct">Correct</span>
            <span className="legend-chip incorrect">Wrong</span>
            <span className="legend-chip missing">Missing</span>
          </div>
        </section>

        <div className="supplemental-panels">
          <section className="panel quiz-controls-panel">
            {quizzes.length > 1 ? (
              <>
                <label className="field-label" htmlFor="quiz-picker">
                  Quiz
                </label>
                <select
                  id="quiz-picker"
                  className="quiz-picker"
                  value={quiz.id}
                  onChange={(event) => handleQuizChange(event.target.value)}
                >
                  {quizzes.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.title}
                    </option>
                  ))}
                </select>
              </>
            ) : null}

            <label className="toggle-row compact-toggle-row" htmlFor="disable-timer">
              <span className="toggle-copy">
                <span className="toggle-label">Disable timer</span>
                <span className="toggle-note">Run this board untimed.</span>
              </span>
              <input
                id="disable-timer"
                type="checkbox"
                checked={isTimerDisabled}
                onChange={handleTimerDisabledChange}
              />
            </label>

            <div className="quiz-meta-row" aria-label="Quiz summary">
              <span className="quiz-meta-chip">
                {assignedCount}/{quiz.regions.length} placed
              </span>
              <span className="quiz-meta-chip">
                {isSubmitted
                  ? `${correctCount}/${quiz.regions.length} correct`
                  : timerIsActive && remainingSeconds !== null
                    ? `${formatTime(remainingSeconds)} left`
                    : 'Untimed'}
              </span>
              {isSubmitted ? (
                <span className="quiz-meta-chip subdued">
                  {incorrectCount} wrong · {missingCount} blank
                </span>
              ) : null}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header compact">
              <div>
                <h2>Label Bank</h2>
              </div>
              <span className="bank-count">
                {visibleAnswers.length} {isSubmitted ? 'shown' : 'available'}
              </span>
            </div>

            <form className="search-form" onSubmit={handleSearchSubmit}>
              <input
                id="answer-search"
                name="answer-search"
                type="search"
                value={bankQuery}
                onChange={(event) => setBankQuery(event.target.value)}
                placeholder="Search answers or aliases"
              />
              <button
                type="submit"
                className="button secondary"
                disabled={!selectedRegionId || visibleAnswers.length === 0 || isSubmitted}
              >
                Assign first match
              </button>
            </form>

            <div className="answer-grid">
              {visibleAnswers.map((answer) => {
                const answerStatus = getAnswerStatus(answer.id)
                const answerStateLabel = getAnswerStateLabel(answer.id)

                return (
                  <button
                    key={answer.id}
                    className={clsx('answer-chip', `answer-${answerStatus}`, {
                      'is-selected': selectedAnswerId === answer.id,
                    })}
                    onClick={() => handleAnswerClick(answer.id)}
                    disabled={isSubmitted}
                  >
                    <span>{answer.name}</span>
                    <span className="answer-state">{answerStateLabel}</span>
                  </button>
                )
              })}

              {visibleAnswers.length === 0 ? (
                <p className="empty-state">
                  No labels match that search. Try a full name, an abbreviation,
                  or a common alias.
                </p>
              ) : null}
            </div>
          </section>

          {isSubmitted ? (
            <section className="panel results-panel">
              <div className="panel-header compact">
                <div>
                  <h2>Results</h2>
                </div>
              </div>

              <div className="results-table-wrapper">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Region</th>
                      <th>Your label</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result) => (
                      <tr key={result.id}>
                        <td>{result.name}</td>
                        <td>
                          {result.guessId ? regionById[result.guessId].name : 'Blank'}
                        </td>
                        <td className={`result-${result.status}`}>{result.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  )
}

export default App
