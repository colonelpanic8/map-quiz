# Map Quiz

A batch-submission map quiz system. The interaction is inspired by Sporcle picture-click geography quizzes, but the grading model is different: you place labels across the full map first, then submit once to score the entire board in a single pass.

## What it ships with

- `Find the US States`
- `Countries of the World`

Each board can optionally expose subset filters. The sample data now includes:

- `Find the US States` with filters such as `Original 13`, `Midwest`, and `South`
- `Countries of the World` with overlapping filters such as `Europe`, `Africa`, and `Middle East`

Both are built from atlas packages rather than hard-coded SVGs:

- `us-atlas`
- `world-atlas`

## Run it

```bash
npm install
npm run dev
```

Build for production with:

```bash
npm run build
```

Build the GitHub Pages artifact with Nix:

```bash
nix build .#github-pages
```

That output is a static site at the root of `./result`, ready to upload to GitHub Pages.

To use the workflow, set the repository's GitHub Pages source to `GitHub Actions`.

## Data model

The UI only needs a normalized quiz definition:

```ts
type MapQuizDefinition = {
  id: string
  title: string
  description: string
  prompt: string
  credit: string
  timeLimitSeconds: number
  initialMapTransform?: { scale: number; x: number; y: number }
  defaultActiveSubsetIds?: string[]
  subsets?: Array<{
    id: string
    title: string
    regionIds: string[]
    viewportRegionIds: string[]
    initialMapTransform?: { scale: number; x: number; y: number }
  }>
  viewBox: { width: number; height: number }
  regions: Array<{
    id: string
    name: string
    aliases: string[]
    bounds: { minX: number; minY: number; maxX: number; maxY: number }
    path: string
  }>
}
```

There are two helpers in [src/lib/quiz-builder.ts](/home/imalison/Projects/map-quiz/src/lib/quiz-builder.ts):

- `createTopoQuiz(...)` for TopoJSON sources such as `us-atlas` and `world-atlas`
- `createPolygonQuiz(...)` for arbitrary polygon coordinates

That second helper is the bridge to Sporcle-style image maps. Their state quiz uses a plain HTML image map with polygon coordinates, so those coordinates can be transformed into `points: [[x, y], ...]` inputs without changing the rest of the UI.

## Adding a new quiz

Add another entry in [src/data/quizzes.ts](/home/imalison/Projects/map-quiz/src/data/quizzes.ts). For a projected TopoJSON source:

```ts
createTopoQuiz({
  id: 'my-quiz',
  title: 'My Quiz',
  description: 'Batch-label the map.',
  prompt: 'Place every answer before grading.',
  credit: 'Geometry source here.',
  timeLimitSeconds: 600,
  topology,
  objectName: 'regions',
  projection: 'equalEarth',
  aliasesByName: {
    'United States of America': ['USA', 'United States', 'US'],
  },
})
```

For raw polygon data:

```ts
createPolygonQuiz({
  id: 'custom-image-map',
  title: 'Custom Polygon Map',
  description: 'Image-map style regions.',
  prompt: 'Assign labels, then submit.',
  credit: 'Custom geometry.',
  timeLimitSeconds: 300,
  viewBox: { width: 920, height: 569 },
  regions: [
    {
      id: 'alpha',
      name: 'Alpha',
      points: [
        [10, 10],
        [90, 20],
        [75, 80],
      ],
    },
  ],
})
```

## Interaction model

- Click a region and then a label, or a label and then a region.
- Placements stay editable until submission.
- Subset filters can narrow the active answer bank without switching to a separate quiz.
- Subset filters may overlap, and `Reset view` fits the union of the active subset viewports.
- The `Disable timer` toggle starts on by default; uncheck it for timed rounds.
- Search works against names plus aliases and abbreviations.
- `Grade Map` checks every region at once.

## Notes

- The current sample quizzes are fully local and do not depend on Sporcle assets.
- The system is intended to be extended to countries, states, provinces, territories, or any other region set that can be represented as polygons.
- The repository includes a GitHub Actions workflow that builds `.#github-pages` and deploys it to GitHub Pages.
