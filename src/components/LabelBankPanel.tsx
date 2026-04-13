import type { ChangeEventHandler, FormEventHandler } from 'react'
import clsx from 'clsx'
import type { QuizRegion } from '../lib/quiz-builder.ts'
import {
  getAnswerStateLabel,
  getAnswerStatus,
} from '../lib/map-quiz-ui.ts'

type LabelBankPanelProps = {
  answerPlacement: Record<string, string>
  bankQuery: string
  compactBankSummary: string
  isSubmitted: boolean
  onAnswerClick: (answerId: string) => void
  onBankQueryChange: ChangeEventHandler<HTMLInputElement>
  onClose: () => void
  onSearchSubmit: FormEventHandler<HTMLFormElement>
  selectedAnswerId: string | null
  selectedRegionId: string | null
  visibleAnswers: QuizRegion[]
}

export function LabelBankPanel({
  answerPlacement,
  bankQuery,
  compactBankSummary,
  isSubmitted,
  onAnswerClick,
  onBankQueryChange,
  onClose,
  onSearchSubmit,
  selectedAnswerId,
  selectedRegionId,
  visibleAnswers,
}: LabelBankPanelProps) {
  return (
    <section className="panel overlay-panel bank-panel">
      <div className="panel-header compact">
        <div>
          <h2>Label Bank</h2>
        </div>
        <div className="panel-header-tools">
          <span className="bank-count">{compactBankSummary}</span>
          <button type="button" className="panel-dismiss" onClick={onClose}>
            Minimize
          </button>
        </div>
      </div>

      <form className="search-form" onSubmit={onSearchSubmit}>
        <input
          id="answer-search"
          name="answer-search"
          type="search"
          value={bankQuery}
          onChange={onBankQueryChange}
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
          const answerStatus = getAnswerStatus(answer.id, answerPlacement, isSubmitted)
          const answerStateLabel = getAnswerStateLabel(
            answer.id,
            answerPlacement,
            isSubmitted,
            selectedAnswerId,
          )

          return (
            <button
              key={answer.id}
              className={clsx('answer-chip', `answer-${answerStatus}`, {
                'is-selected': selectedAnswerId === answer.id,
              })}
              onClick={() => onAnswerClick(answer.id)}
              disabled={isSubmitted}
            >
              <span>{answer.name}</span>
              <span className="answer-state">{answerStateLabel}</span>
            </button>
          )
        })}

        {visibleAnswers.length === 0 ? (
          <p className="empty-state">
            No labels match that search. Try a full name, an abbreviation, or a
            common alias.
          </p>
        ) : null}
      </div>
    </section>
  )
}
