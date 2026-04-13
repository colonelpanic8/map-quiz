type HudDockProps = {
  activeRegionCount: number
  assignedCount: number
  compactBankSummary: string
  compactQuizSummary: string
  compactResultsSummary: string
  correctCount: number
  isBankPanelOpen: boolean
  isMainPanelOpen: boolean
  isResultsPanelOpen: boolean
  isSubmitted: boolean
  onOpenBankPanel: () => void
  onOpenMainPanel: () => void
  onOpenResultsPanel: () => void
  quizTitle: string
}

export function HudDock({
  activeRegionCount,
  assignedCount,
  compactBankSummary,
  compactQuizSummary,
  compactResultsSummary,
  correctCount,
  isBankPanelOpen,
  isMainPanelOpen,
  isResultsPanelOpen,
  isSubmitted,
  onOpenBankPanel,
  onOpenMainPanel,
  onOpenResultsPanel,
  quizTitle,
}: HudDockProps) {
  return (
    <div className="hud-dock">
      {!isMainPanelOpen ? (
        <button
          type="button"
          className="hud-toggle hud-toggle-primary"
          onClick={onOpenMainPanel}
          aria-expanded={isMainPanelOpen}
        >
          <span className="hud-toggle-label">Quiz</span>
          <strong>{quizTitle}</strong>
          <span className="hud-toggle-meta">
            {assignedCount}/{activeRegionCount} placed | {compactQuizSummary}
          </span>
        </button>
      ) : null}

      {!isBankPanelOpen ? (
        <button
          type="button"
          className="hud-toggle"
          onClick={onOpenBankPanel}
          aria-expanded={isBankPanelOpen}
        >
          <span className="hud-toggle-label">Labels</span>
          <strong>{compactBankSummary}</strong>
          <span className="hud-toggle-meta">Search and assign answers</span>
        </button>
      ) : null}

      {isSubmitted && !isResultsPanelOpen ? (
        <button
          type="button"
          className="hud-toggle"
          onClick={onOpenResultsPanel}
          aria-expanded={isResultsPanelOpen}
        >
          <span className="hud-toggle-label">Results</span>
          <strong>
            {correctCount}/{activeRegionCount} correct
          </strong>
          <span className="hud-toggle-meta">{compactResultsSummary}</span>
        </button>
      ) : null}
    </div>
  )
}
