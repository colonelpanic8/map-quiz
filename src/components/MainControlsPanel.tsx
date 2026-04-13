import type { ChangeEventHandler } from 'react'
import clsx from 'clsx'
import type {
  MapQuizDefinition,
  QuizProjectionOption,
  QuizSubset,
} from '../lib/quiz-builder.ts'
import { getQuizPickerId } from '../lib/map-quiz-ui.ts'

type MainControlsPanelProps = {
  activeProjectionOptions: QuizProjectionOption[]
  activeRegionCount: number
  activeSubsetIds: string[]
  activeSubsetSummary: string
  activeSubsets: QuizSubset[]
  assignedCount: number
  compactQuizSummary: string
  incorrectCount: number
  isSubmitted: boolean
  isTimerDisabled: boolean
  missingCount: number
  onClearSelectedRegion: () => void
  onClearSubsetFilters: () => void
  onClose: () => void
  onGradeMap: () => void
  onProjectionChange: (projectionId: string) => void
  onQuizChange: (quizId: string) => void
  onReset: () => void
  onSubsetToggle: (subsetId: string) => void
  onTimerDisabledChange: ChangeEventHandler<HTMLInputElement>
  quiz: MapQuizDefinition
  quizPickerEntries: MapQuizDefinition[]
  quizzes: MapQuizDefinition[]
  selectedRegionId: string | null
  selectionSummary: string
}

export function MainControlsPanel({
  activeProjectionOptions,
  activeRegionCount,
  activeSubsetIds,
  activeSubsetSummary,
  activeSubsets,
  assignedCount,
  compactQuizSummary,
  incorrectCount,
  isSubmitted,
  isTimerDisabled,
  missingCount,
  onClearSelectedRegion,
  onClearSubsetFilters,
  onClose,
  onGradeMap,
  onProjectionChange,
  onQuizChange,
  onReset,
  onSubsetToggle,
  onTimerDisabledChange,
  quiz,
  quizPickerEntries,
  quizzes,
  selectedRegionId,
  selectionSummary,
}: MainControlsPanelProps) {
  return (
    <section className="panel overlay-panel main-controls-panel">
      <div className="panel-header">
        <div>
          <span className="selection-callout-label">Map quiz</span>
          <h2>{quiz.title}</h2>
          <p className="panel-copy">{quiz.prompt}</p>
        </div>
        <div className="panel-actions">
          <button className="button secondary" onClick={onReset}>
            Reset
          </button>
          <button className="button" onClick={onGradeMap}>
            Grade Map
          </button>
          <button type="button" className="panel-dismiss" onClick={onClose}>
            Minimize
          </button>
        </div>
      </div>

      <div className="control-stack">
        {quizzes.length > 1 ? (
          <div>
            <label className="field-label" htmlFor="quiz-picker">
              Quiz
            </label>
            <select
              id="quiz-picker"
              className="quiz-picker"
              value={getQuizPickerId(quiz)}
              onChange={(event) => onQuizChange(event.target.value)}
            >
              {quizPickerEntries.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {activeProjectionOptions.length > 1 ? (
          <div>
            <label className="field-label" htmlFor="projection-picker">
              Projection
            </label>
            <select
              id="projection-picker"
              className="quiz-picker"
              value={quiz.selectedProjectionId}
              onChange={(event) => onProjectionChange(event.target.value)}
            >
              {activeProjectionOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {quiz.subsets?.length ? (
          <div className="subset-controls">
            <label className="field-label">Subsets</label>
            <p className="subset-note">
              {activeSubsets.length === 0
                ? 'No subset filters selected. The whole board is active.'
                : 'Active subset filters control both the answer bank and Reset view.'}
            </p>
            <div className="subset-chip-grid">
              <button
                type="button"
                className={clsx('subset-chip', {
                  'is-active': activeSubsets.length === 0,
                })}
                onClick={onClearSubsetFilters}
                aria-pressed={activeSubsets.length === 0}
              >
                Whole board
              </button>
              {quiz.subsets.map((subset) => (
                <button
                  key={subset.id}
                  type="button"
                  className={clsx('subset-chip', {
                    'is-active': activeSubsetIds.includes(subset.id),
                  })}
                  onClick={() => onSubsetToggle(subset.id)}
                  aria-pressed={activeSubsetIds.includes(subset.id)}
                  title={subset.description}
                >
                  {subset.title}
                </button>
              ))}
            </div>
          </div>
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
            onChange={onTimerDisabledChange}
          />
        </label>
      </div>

      <div className="quiz-meta-row" aria-label="Quiz summary">
        <span className="quiz-meta-chip">
          {assignedCount}/{activeRegionCount} placed
        </span>
        <span className="quiz-meta-chip subdued">{activeSubsetSummary}</span>
        <span className="quiz-meta-chip">{compactQuizSummary}</span>
        {isSubmitted ? (
          <span className="quiz-meta-chip subdued">
            {incorrectCount} wrong · {missingCount} blank
          </span>
        ) : null}
      </div>

      <p className="map-hint">
        Click a region to open the local picker. Scroll or pinch to zoom, then drag
        once you're zoomed in. Tiny regions get dot markers when their shapes would
        otherwise disappear.
      </p>

      <div className="map-selection-summary" aria-live="polite">
        <span>{selectionSummary}</span>
        {!isSubmitted && selectedRegionId ? (
          <button
            className="button ghost map-selection-summary-action"
            onClick={onClearSelectedRegion}
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="legend-row">
        <span className="legend-chip inactive">Context</span>
        <span className="legend-chip preview">Preview</span>
        <span className="legend-chip idle">Empty</span>
        <span className="legend-chip assigned">Placed</span>
        <span className="legend-chip correct">Correct</span>
        <span className="legend-chip incorrect">Wrong</span>
        <span className="legend-chip missing">Missing</span>
      </div>
    </section>
  )
}
