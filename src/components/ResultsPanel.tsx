import type { QuizRegion } from '../lib/quiz-builder.ts'
import type { QuizResult } from '../lib/map-quiz-ui.ts'

type ResultsPanelProps = {
  activeRegionCount: number
  correctCount: number
  onClose: () => void
  regionById: Record<string, QuizRegion>
  results: QuizResult[]
}

export function ResultsPanel({
  activeRegionCount,
  correctCount,
  onClose,
  regionById,
  results,
}: ResultsPanelProps) {
  return (
    <section className="panel overlay-panel results-panel">
      <div className="panel-header compact">
        <div>
          <h2>Results</h2>
        </div>
        <div className="panel-header-tools">
          <span className="bank-count">
            {correctCount}/{activeRegionCount} correct
          </span>
          <button type="button" className="panel-dismiss" onClick={onClose}>
            Minimize
          </button>
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
                <td>{result.guessId ? regionById[result.guessId].name : 'Blank'}</td>
                <td className={`result-${result.status}`}>{result.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
