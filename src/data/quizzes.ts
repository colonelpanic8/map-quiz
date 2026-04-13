import { usStatesQuiz } from './us-states.ts'
import {
  worldCountriesEqualEarthQuiz,
  worldCountriesMercatorQuiz,
  worldCountriesQuiz,
} from './world-countries.ts'

export const quizzes = [
  usStatesQuiz,
  worldCountriesQuiz,
  worldCountriesEqualEarthQuiz,
  worldCountriesMercatorQuiz,
]

export const defaultQuizId = worldCountriesQuiz.id
