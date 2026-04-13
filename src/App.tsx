import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { HudDock } from './components/HudDock.tsx'
import { LabelBankPanel } from './components/LabelBankPanel.tsx'
import { MainControlsPanel } from './components/MainControlsPanel.tsx'
import { QuizMap } from './components/QuizMap.tsx'
import { ResultsPanel } from './components/ResultsPanel.tsx'
import { defaultQuizId, quizzes } from './data/quizzes.ts'
import {
  buildAnswerPlacement,
  buildEmptyAssignments,
  buildQuizResults,
  buildRegionById,
  clamp,
  clampMapTransform,
  DRAG_SUPPRESSION_DISTANCE,
  formatTime,
  getActiveRegionIdSet,
  getActiveSubsets,
  getAnswerMatchRank,
  getDefaultActiveSubsetIds,
  getDefaultMapTransform,
  getDistance,
  getMidpoint,
  getNow,
  getQuizDefinition,
  MAP_SELECTION_MENU_MARGIN,
  MAP_SELECTION_MENU_MAX_HEIGHT,
  MAP_SELECTION_MENU_MAX_WIDTH,
  MAP_SELECTION_MENU_RESERVED_HEIGHT,
  MAP_SELECTION_MENU_ROW_HEIGHT,
  MAP_ZOOM_BUTTON_STEP,
  MIN_MAP_SCALE,
  type AssignmentMap,
  type DragGesture,
  type MapPoint,
  type MapTransform,
  type PinchGesture,
  type SelectionMenuState,
  type TrackedPointer,
  zoomMapTransform,
} from './lib/map-quiz-ui.ts'

const quizPickerEntries = quizzes.filter((entry) => !entry.parentQuizId)

function App() {
  const defaultQuiz = getQuizDefinition(quizzes, defaultQuizId)
  const defaultActiveSubsetIds = getDefaultActiveSubsetIds(defaultQuiz)
  const defaultRegionById = buildRegionById(defaultQuiz)
  const [quizId, setQuizId] = useState(defaultQuizId)
  const [assignments, setAssignments] = useState<AssignmentMap>(() =>
    buildEmptyAssignments(defaultQuiz),
  )
  const [activeSubsetIds, setActiveSubsetIds] = useState<string[]>(
    defaultActiveSubsetIds,
  )
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null)
  const [bankQuery, setBankQuery] = useState('')
  const [pickerQuery, setPickerQuery] = useState('')
  const [isTimerDisabled, setIsTimerDisabled] = useState(true)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [submittedAt, setSubmittedAt] = useState<number | null>(null)
  const [clockNow, setClockNow] = useState(() => Date.now())
  const [countedElapsedMs, setCountedElapsedMs] = useState(0)
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null)
  const [isMapDragging, setIsMapDragging] = useState(false)
  const [isMainPanelOpen, setIsMainPanelOpen] = useState(false)
  const [isBankPanelOpen, setIsBankPanelOpen] = useState(false)
  const [isResultsPanelOpen, setIsResultsPanelOpen] = useState(false)
  const [mapTransform, setMapTransform] = useState<MapTransform>(() =>
    getDefaultMapTransform(
      defaultQuiz,
      defaultRegionById,
      defaultActiveSubsetIds,
    ),
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

  const quiz = getQuizDefinition(quizzes, quizId)
  const regionById = buildRegionById(quiz)
  const activeSubsets = getActiveSubsets(quiz, activeSubsetIds)
  const activeRegionIdSet = getActiveRegionIdSet(quiz, activeSubsetIds)
  const activeRegions = quiz.regions.filter((region) =>
    activeRegionIdSet.has(region.id),
  )
  const defaultMapTransform = getDefaultMapTransform(
    quiz,
    regionById,
    activeSubsetIds,
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
  const assignedCount = activeRegions.filter((region) => assignments[region.id]).length
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

  const answerPlacement = buildAnswerPlacement(assignments)
  const results = buildQuizResults(activeRegions, assignments)
  const correctCount = results.filter(
    (result) => result.status === 'correct',
  ).length
  const incorrectCount = results.filter(
    (result) => result.status === 'incorrect',
  ).length
  const missingCount = results.filter(
    (result) => result.status === 'missing',
  ).length
  const activeRegionCount = activeRegions.length

  function getMatchingAnswers(query: string) {
    return activeRegions
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
  const labelOverlayRegions = [...activeRegions].sort(
    (left, right) =>
      Number(selectedRegionId === left.id) - Number(selectedRegionId === right.id),
  )
  const activeSubsetSummary =
    activeSubsets.length === 0
      ? 'Whole board'
      : activeSubsets.map((subset) => subset.title).join(' · ')
  const mapIsReset =
    mapTransform.scale === defaultMapTransform.scale &&
    mapTransform.x === defaultMapTransform.x &&
    mapTransform.y === defaultMapTransform.y
  const compactQuizSummary = isSubmitted
    ? `${correctCount}/${activeRegionCount} correct`
    : timerIsActive && remainingSeconds !== null
      ? `${formatTime(remainingSeconds)} left`
      : 'Untimed'
  const compactBankSummary = `${visibleAnswers.length} ${
    isSubmitted ? 'shown' : 'available'
  }`
  const compactResultsSummary = `${incorrectCount} wrong | ${missingCount} blank`
  const activeProjectionOptions = quiz.projectionOptions ?? []

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
    setMapTransform(defaultMapTransform)
  }

  function getRegionIdAtClientPoint(clientX: number, clientY: number) {
    const mapSvg = mapSvgRef.current
    if (!mapSvg) {
      return null
    }

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
      )
    )
  }

  const handleMapWheel = useEffectEvent((event: WheelEvent) => {
    const anchor = getMapPoint(event.clientX, event.clientY)
    if (!anchor) {
      return
    }

    closeSelectionMenu({ clearBlankSelection: true })
    event.preventDefault()
    const scaleDelta = Math.exp(-event.deltaY * 0.0025)

    setMapTransform((currentTransform) => {
      return zoomMapTransform(
        currentTransform,
        currentTransform.scale * scaleDelta,
        anchor,
        quiz.viewBox,
      )
    })
  })

  useEffect(() => {
    const mapSvg = mapSvgRef.current
    if (!mapSvg) {
      return
    }

    const onWheel = (event: WheelEvent) => {
      handleMapWheel(event)
    }

    mapSvg.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      mapSvg.removeEventListener('wheel', onWheel)
    }
  }, [])

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
    const regionId =
      !suppressRegionClickRef.current &&
      !multiTouchGestureRef.current &&
      activePointersRef.current.size === 1
        ? getRegionIdAtClientPoint(event.clientX, event.clientY)
        : null

    finishMapPointerGesture(event.pointerId, event.currentTarget)

    if (regionId) {
      handleRegionClick(regionId, {
        clientX: event.clientX,
        clientY: event.clientY,
      })
    }
  }

  function handleMapPointerCancel(event: ReactPointerEvent<SVGSVGElement>) {
    finishMapPointerGesture(event.pointerId, event.currentTarget)
  }

  function resetQuizState(
    nextQuizId: string,
    options?: {
      nextActiveSubsetIds?: string[]
      preserveAssignments?: boolean
    },
  ) {
    const nextQuiz = getQuizDefinition(quizzes, nextQuizId)
    const nextRegionById = buildRegionById(nextQuiz)
    const nextActiveSubsetIds =
      options?.nextActiveSubsetIds ?? getDefaultActiveSubsetIds(nextQuiz)

    if (!options?.preserveAssignments) {
      setAssignments(buildEmptyAssignments(nextQuiz))
    }
    setActiveSubsetIds(nextActiveSubsetIds)
    setSelectedAnswerId(null)
    setSelectedRegionId(null)
    setBankQuery('')
    setPickerQuery('')
    setSelectionMenu(null)
    setStartedAt(null)
    setSubmittedAt(null)
    setCountedElapsedMs(0)
    setTimerStartedAt(null)
    setClockNow(getNow())
    setIsResultsPanelOpen(false)
    clearMapGestures()
    setMapTransform(
      getDefaultMapTransform(nextQuiz, nextRegionById, nextActiveSubsetIds),
    )
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
    event?: { clientX: number; clientY: number },
  ) {
    if (suppressRegionClickRef.current || !activeRegionIdSet.has(regionId)) {
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
    setIsResultsPanelOpen(true)
  }

  function handleReset() {
    resetQuizState(quiz.id, {
      nextActiveSubsetIds: activeSubsetIds,
    })
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

  function handleProjectionChange(nextProjectionId: string) {
    const nextProjection = activeProjectionOptions.find(
      (option) => option.id === nextProjectionId,
    )
    if (!nextProjection || nextProjection.quizId === quiz.id) {
      return
    }

    const nextQuiz = getQuizDefinition(quizzes, nextProjection.quizId)
    const nextRegionById = buildRegionById(nextQuiz)

    setQuizId(nextProjection.quizId)
    setSelectedAnswerId(null)
    setSelectedRegionId(null)
    setPickerQuery('')
    setSelectionMenu(null)
    clearMapGestures()
    setMapTransform(
      getDefaultMapTransform(nextQuiz, nextRegionById, activeSubsetIds),
    )
  }

  function handleSubsetToggle(subsetId: string) {
    const nextActiveSubsetIds = activeSubsetIds.includes(subsetId)
      ? activeSubsetIds.filter((currentSubsetId) => currentSubsetId !== subsetId)
      : [...activeSubsetIds, subsetId]

    resetQuizState(quiz.id, {
      nextActiveSubsetIds,
      preserveAssignments: true,
    })
  }

  function clearSubsetFilters() {
    resetQuizState(quiz.id, {
      nextActiveSubsetIds: [],
      preserveAssignments: true,
    })
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

    const scopeSummary =
      activeSubsets.length === 0
        ? `Whole board active • ${activeRegionCount} regions.`
        : `Active subsets: ${activeSubsetSummary} • ${activeRegionCount} regions.`

    return isSubmitted
      ? 'Click a region to inspect it after grading.'
      : `${scopeSummary} Click a region to open the picker, or choose a label from the bank.`
  })()

  return (
    <div className="app-shell">
      <main className="workspace">
        <section className="map-panel">
          <div className="map-stage">
            <QuizMap
              activeRegionIdSet={activeRegionIdSet}
              answerPlacement={answerPlacement}
              assignments={assignments}
              hiddenQuickPickerCount={hiddenQuickPickerCount}
              isMapDragging={isMapDragging}
              isSubmitted={isSubmitted}
              labelOverlayRegions={labelOverlayRegions}
              mapIsReset={mapIsReset}
              mapSvgRef={mapSvgRef}
              mapTransform={mapTransform}
              onAnswerClick={handleAnswerClick}
              onClearSelectedRegion={clearSelectedRegion}
              onCloseSelectionMenu={closeSelectionMenu}
              onMapPointerCancel={handleMapPointerCancel}
              onMapPointerDown={handleMapPointerDown}
              onMapPointerMove={handleMapPointerMove}
              onMapPointerUp={handleMapPointerUp}
              onPickerQueryChange={setPickerQuery}
              onPickerSearchSubmit={handlePickerSearchSubmit}
              onResetZoom={resetMapZoom}
              onZoomIn={() => nudgeMapZoom(MAP_ZOOM_BUTTON_STEP)}
              onZoomOut={() => nudgeMapZoom(1 / MAP_ZOOM_BUTTON_STEP)}
              pickerQuery={pickerQuery}
              quickPickerAnswers={quickPickerAnswers}
              quiz={quiz}
              regionById={regionById}
              selectedAnswerId={selectedAnswerId}
              selectedRegionGuess={selectedRegionGuess}
              selectedRegionId={selectedRegionId}
              selectionMenu={selectionMenu}
            />

            <div className="map-overlay-layer">
              {isMainPanelOpen ? (
                <MainControlsPanel
                  activeProjectionOptions={activeProjectionOptions}
                  activeRegionCount={activeRegionCount}
                  activeSubsetIds={activeSubsetIds}
                  activeSubsetSummary={activeSubsetSummary}
                  activeSubsets={activeSubsets}
                  assignedCount={assignedCount}
                  compactQuizSummary={compactQuizSummary}
                  incorrectCount={incorrectCount}
                  isSubmitted={isSubmitted}
                  isTimerDisabled={isTimerDisabled}
                  missingCount={missingCount}
                  onClearSelectedRegion={clearSelectedRegion}
                  onClearSubsetFilters={clearSubsetFilters}
                  onClose={() => setIsMainPanelOpen(false)}
                  onGradeMap={handleGradeMap}
                  onProjectionChange={handleProjectionChange}
                  onQuizChange={handleQuizChange}
                  onReset={handleReset}
                  onSubsetToggle={handleSubsetToggle}
                  onTimerDisabledChange={handleTimerDisabledChange}
                  quiz={quiz}
                  quizPickerEntries={quizPickerEntries}
                  quizzes={quizzes}
                  selectedRegionId={selectedRegionId}
                  selectionSummary={selectionSummary}
                />
              ) : null}

              {isBankPanelOpen || (isSubmitted && isResultsPanelOpen) ? (
                <div className="floating-column">
                  {isBankPanelOpen ? (
                    <LabelBankPanel
                      answerPlacement={answerPlacement}
                      bankQuery={bankQuery}
                      compactBankSummary={compactBankSummary}
                      isSubmitted={isSubmitted}
                      onAnswerClick={handleAnswerClick}
                      onBankQueryChange={(event) =>
                        setBankQuery(event.target.value)
                      }
                      onClose={() => setIsBankPanelOpen(false)}
                      onSearchSubmit={handleSearchSubmit}
                      selectedAnswerId={selectedAnswerId}
                      selectedRegionId={selectedRegionId}
                      visibleAnswers={visibleAnswers}
                    />
                  ) : null}

                  {isSubmitted && isResultsPanelOpen ? (
                    <ResultsPanel
                      activeRegionCount={activeRegionCount}
                      correctCount={correctCount}
                      onClose={() => setIsResultsPanelOpen(false)}
                      regionById={regionById}
                      results={results}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>

            <HudDock
              activeRegionCount={activeRegionCount}
              assignedCount={assignedCount}
              compactBankSummary={compactBankSummary}
              compactQuizSummary={compactQuizSummary}
              compactResultsSummary={compactResultsSummary}
              correctCount={correctCount}
              isBankPanelOpen={isBankPanelOpen}
              isMainPanelOpen={isMainPanelOpen}
              isResultsPanelOpen={isResultsPanelOpen}
              isSubmitted={isSubmitted}
              onOpenBankPanel={() => setIsBankPanelOpen(true)}
              onOpenMainPanel={() => setIsMainPanelOpen(true)}
              onOpenResultsPanel={() => setIsResultsPanelOpen(true)}
              quizTitle={quiz.title}
            />
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
