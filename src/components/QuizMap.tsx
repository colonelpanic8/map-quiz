import type {
  FormEventHandler,
  PointerEventHandler,
  RefObject,
} from 'react'
import clsx from 'clsx'
import type { MapQuizDefinition, QuizRegion } from '../lib/quiz-builder.ts'
import {
  getAnswerStateLabel,
  getAnswerStatus,
  getLabelBadgeStrokeWidth,
  getLabelTextStrokeWidth,
  getMapStrokeWidth,
  getRegionOverlayLabel,
  getRegionStatus,
  getSmallRegionMarker,
  transformMapPoint,
  type AssignmentMap,
  type MapTransform,
  type SelectionMenuState,
} from '../lib/map-quiz-ui.ts'

type QuizMapProps = {
  activeRegionIdSet: Set<string>
  answerPlacement: Record<string, string>
  assignments: AssignmentMap
  hiddenQuickPickerCount: number
  isMapDragging: boolean
  isSubmitted: boolean
  labelOverlayRegions: QuizRegion[]
  mapIsReset: boolean
  mapSvgRef: RefObject<SVGSVGElement | null>
  mapTransform: MapTransform
  onAnswerClick: (answerId: string) => void
  onClearSelectedRegion: () => void
  onCloseSelectionMenu: (options?: { clearBlankSelection?: boolean }) => void
  onGradeMap: () => void
  onMapPointerCancel: PointerEventHandler<SVGSVGElement>
  onMapPointerDown: PointerEventHandler<SVGSVGElement>
  onMapPointerMove: PointerEventHandler<SVGSVGElement>
  onMapPointerUp: PointerEventHandler<SVGSVGElement>
  onPickerQueryChange: (value: string) => void
  onReset: () => void
  onPickerSearchSubmit: FormEventHandler<HTMLFormElement>
  onResetZoom: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  pickerQuery: string
  quickPickerAnswers: QuizRegion[]
  quiz: MapQuizDefinition
  regionById: Record<string, QuizRegion>
  selectedAnswerId: string | null
  selectedRegionGuess: QuizRegion | null
  selectedRegionId: string | null
  selectionMenu: SelectionMenuState | null
}

export function QuizMap({
  activeRegionIdSet,
  answerPlacement,
  assignments,
  hiddenQuickPickerCount,
  isMapDragging,
  isSubmitted,
  labelOverlayRegions,
  mapIsReset,
  mapSvgRef,
  mapTransform,
  onAnswerClick,
  onClearSelectedRegion,
  onCloseSelectionMenu,
  onGradeMap,
  onMapPointerCancel,
  onMapPointerDown,
  onMapPointerMove,
  onMapPointerUp,
  onPickerQueryChange,
  onReset,
  onPickerSearchSubmit,
  onResetZoom,
  onZoomIn,
  onZoomOut,
  pickerQuery,
  quickPickerAnswers,
  quiz,
  regionById,
  selectedAnswerId,
  selectedRegionGuess,
  selectedRegionId,
  selectionMenu,
}: QuizMapProps) {
  return (
    <>
      <svg
        ref={mapSvgRef}
        className={clsx('quiz-map', {
          'is-dragging': isMapDragging,
          'is-pannable': mapTransform.scale > 1,
        })}
        viewBox={`0 0 ${quiz.viewBox.width} ${quiz.viewBox.height}`}
        role="img"
        aria-label={quiz.title}
        onPointerCancel={onMapPointerCancel}
        onPointerDown={onMapPointerDown}
        onPointerMove={onMapPointerMove}
        onPointerUp={onMapPointerUp}
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
            const regionStatus = getRegionStatus(
              region.id,
              activeRegionIdSet,
              assignments,
              isSubmitted,
            )
            const isActiveRegion = activeRegionIdSet.has(region.id)
            const isSelectedRegion = selectedRegionId === region.id
            const strokeWidth = getMapStrokeWidth(mapTransform.scale, {
              isPreviewSelected: !isSubmitted && isSelectedRegion,
              isResultSelected: isSubmitted && isSelectedRegion,
            })

            return (
              <g key={region.id} className="map-region-layer">
                <path
                  data-region-id={region.id}
                  d={region.path}
                  className={clsx('map-region', `status-${regionStatus}`, {
                    'is-inactive': !isActiveRegion,
                    'is-preview-selected': !isSubmitted && isSelectedRegion,
                    'is-result-selected': isSubmitted && isSelectedRegion,
                  })}
                  strokeWidth={strokeWidth}
                  vectorEffect="non-scaling-stroke"
                >
                  <title>
                    {!isActiveRegion
                      ? `${region.name} • context only on the current board`
                      : isSubmitted
                        ? `${region.name}${
                            guessName ? ` • your label: ${guessName}` : ' • blank'
                          }`
                        : guessName
                          ? `Placed label: ${guessName}`
                          : 'Unassigned region'}
                  </title>
                </path>
              </g>
            )
          })}
        </g>
        <g>
          {labelOverlayRegions.map((region) => {
            const regionStatus = getRegionStatus(
              region.id,
              activeRegionIdSet,
              assignments,
              isSubmitted,
            )
            const isSelectedRegion = selectedRegionId === region.id
            const marker = getSmallRegionMarker(
              region,
              isSelectedRegion,
              mapTransform.scale,
            )
            if (!marker) {
              return null
            }

            const markerPosition = transformMapPoint(region.labelPosition, mapTransform)

            return (
              <g
                key={`${region.id}-marker`}
                data-region-id={region.id}
                className={clsx('map-region-marker', `status-${regionStatus}`, {
                  'is-preview-selected': !isSubmitted && isSelectedRegion,
                  'is-result-selected': isSubmitted && isSelectedRegion,
                })}
                transform={`translate(${markerPosition.x} ${markerPosition.y})`}
              >
                <circle className="map-region-marker-hitbox" r={marker.hitRadius} />
                <circle className="map-region-marker-ring" r={marker.ringRadius} />
                <circle className="map-region-marker-dot" r={marker.dotRadius} />
                <title>{region.name}</title>
              </g>
            )
          })}

          {labelOverlayRegions.map((region) => {
            const guessId = assignments[region.id]
            const regionStatus = getRegionStatus(
              region.id,
              activeRegionIdSet,
              assignments,
              isSubmitted,
            )
            const isSelectedRegion = selectedRegionId === region.id
            const overlayLabel = getRegionOverlayLabel(
              region,
              guessId ? regionById[guessId] : null,
              isSelectedRegion,
              mapTransform.scale,
            )
            if (!overlayLabel) {
              return null
            }

            const labelPosition = transformMapPoint(region.labelPosition, mapTransform)
            const labelWidth = overlayLabel.text.length * overlayLabel.fontSize * 0.58

            return (
              <g
                key={`${region.id}-label`}
                className={clsx('map-region-label', `status-${regionStatus}`, {
                  'is-selected': isSelectedRegion,
                })}
                transform={`translate(${labelPosition.x} ${labelPosition.y})`}
              >
                {isSelectedRegion ? (
                  <rect
                    x={-(labelWidth / 2 + 7)}
                    y={-(overlayLabel.fontSize * 0.85)}
                    width={labelWidth + 14}
                    height={overlayLabel.fontSize * 1.45}
                    rx={overlayLabel.fontSize * 0.45}
                    ry={overlayLabel.fontSize * 0.45}
                    strokeWidth={getLabelBadgeStrokeWidth(overlayLabel.fontSize)}
                  />
                ) : null}
                <text
                  fontSize={overlayLabel.fontSize}
                  strokeWidth={getLabelTextStrokeWidth(overlayLabel.fontSize)}
                >
                  {overlayLabel.text}
                </text>
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
              <strong>Selected region</strong>
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
                  onClick={onClearSelectedRegion}
                >
                  Clear
                </button>
              ) : null}
              <button
                type="button"
                className="map-selection-dismiss"
                onClick={() =>
                  onCloseSelectionMenu({ clearBlankSelection: true })
                }
                aria-label="Close quick picker"
              >
                Close
              </button>
            </div>
          </div>

          <form className="map-selection-search" onSubmit={onPickerSearchSubmit}>
            <input
              name="map-answer-search"
              type="search"
              value={pickerQuery}
              onChange={(event) => onPickerQueryChange(event.target.value)}
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
              const answerStatus = getAnswerStatus(
                answer.id,
                answerPlacement,
                isSubmitted,
              )
              const answerStateLabel = getAnswerStateLabel(
                answer.id,
                answerPlacement,
                isSubmitted,
                selectedAnswerId,
              )

              return (
                <button
                  key={answer.id}
                  type="button"
                  className={clsx('answer-chip', 'compact', `answer-${answerStatus}`, {
                    'is-selected': selectedAnswerId === answer.id,
                  })}
                  onClick={() => onAnswerClick(answer.id)}
                >
                  <span>{answer.name}</span>
                  <span className="answer-state">{answerStateLabel}</span>
                </button>
              )
            })}

            {hiddenQuickPickerCount > 0 ? (
              <p className="map-selection-note">
                Showing the first {quickPickerAnswers.length} candidates that fit on
                screen.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="map-zoom-controls" role="group" aria-label="Map zoom controls">
        <span className="map-zoom-readout">{mapTransform.scale.toFixed(1)}x</span>
        <button
          type="button"
          className="map-zoom-button"
          onClick={onZoomIn}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          className="map-zoom-button"
          onClick={onZoomOut}
          aria-label="Zoom out"
          disabled={mapTransform.scale <= 1}
        >
          -
        </button>
        <button type="button" className="map-zoom-action" onClick={onReset}>
          Reset
        </button>
        <button type="button" className="map-zoom-action primary" onClick={onGradeMap}>
          Grade Map
        </button>
        <button
          type="button"
          className="map-zoom-reset"
          onClick={onResetZoom}
          disabled={mapIsReset}
        >
          Reset view
        </button>
      </div>
    </>
  )
}
