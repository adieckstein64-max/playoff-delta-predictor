import { useState } from "react";

/**
 * PlayoffDeltaProject
 * -----------------------------------------------------------------------
 * Portfolio case-study page for the "Playoff Performance Delta Predictor"
 * project. Self-contained: no external chart library required (charts are
 * hand-drawn inline SVG), only Tailwind core utility classes for styling.
 *
 * Drop this into any React + Tailwind project:
 *   import PlayoffDeltaProject from "./PlayoffDeltaProject";
 *   <PlayoffDeltaProject />
 *
 * All numbers below are real results from the project (not illustrative
 * placeholders): 34 train / 48 test player-seasons, 2022 -> 2023 NBA
 * playoffs, sourced from Basketball-Reference. See the project README for
 * full methodology.
 */

const FEATURES = [
  { name: "TS%", value: -1.48 },
  { name: "USG%", value: -1.19 },
  { name: "age", value: -0.83 },
  { name: "TOV%", value: -0.62 },
  { name: "WS/48", value: 0.61 },
  { name: "AST%", value: 0.44 },
  { name: "BPM", value: -0.36 },
  { name: "3PAr", value: -0.29 },
];

// actual vs predicted playoff BPM delta, full 2023 held-out test set (48 players)
const TEST_POINTS = [
  [-0.3, 0.4], [9.4, -0.3], [1.0, -1.4], [-2.2, -0.2], [4.4, 1.8], [-1.8, -1.0],
  [-1.2, 0.2], [0.7, -0.5], [2.5, -0.7], [-2.2, -1.6], [0.9, -0.3], [3.7, 0.1],
  [-0.2, -4.2], [2.0, -3.0], [-7.3, -4.4], [1.6, 0.8], [0.4, -1.5], [2.3, 1.3],
  [0.0, -0.9], [-4.5, -1.7], [-0.4, -3.2], [-2.1, -2.0], [-1.3, -2.6], [-2.2, 0.8],
  [3.5, 1.1], [-2.3, -0.5], [-4.4, -0.3], [-0.3, -0.8], [-6.5, -3.1], [1.6, 0.7],
  [-1.2, -0.3], [1.0, 1.7], [1.5, -3.9], [-1.0, -5.7], [-0.5, -1.6], [-0.6, -1.9],
  [-0.6, -0.7], [-2.7, -0.8], [6.5, -1.4], [-2.9, -0.6], [7.7, -2.1], [-4.4, -1.5],
  [-2.4, -0.5], [1.6, -1.6], [-0.9, -1.3], [3.5, 1.7], [-2.5, -6.3], [2.8, 2.5],
];

// a handful of named examples, chosen to be representative (not cherry-picked
// for accuracy) -- includes the model's biggest miss and its closer calls
const EXAMPLES = [
  {
    name: "Anthony Edwards",
    pos: "SG",
    actual: 9.4,
    predicted: -0.3,
    note: "The model's biggest miss. Edwards's playoff BPM jumped far more than his regular-season profile suggested -- exactly the kind of leap in intensity/role that box-score stats alone don't capture.",
  },
  {
    name: "Kawhi Leonard",
    pos: "SF",
    actual: 7.7,
    predicted: -2.1,
    note: "Small playoff sample (2 games) for Leonard made this delta noisy and hard to predict from a regular-season baseline.",
  },
  {
    name: "Jalen Brunson",
    pos: "PG",
    actual: 3.7,
    predicted: 0.1,
    note: "Right direction, wrong magnitude -- the model correctly flagged an uptick but underestimated its size.",
  },
  {
    name: "Bam Adebayo",
    pos: "C",
    actual: -2.2,
    predicted: -0.2,
    note: "Right direction, small effect -- one of the model's more reasonable calls.",
  },
  {
    name: "Joel Embiid",
    pos: "C",
    actual: -7.3,
    predicted: -4.4,
    note: "The largest real decline in the test set. The model caught the direction and a meaningful chunk of the size -- its best call among the extremes.",
  },
  {
    name: "Nikola Jokić",
    pos: "C",
    actual: -0.2,
    predicted: -4.2,
    note: "A clear overcorrection: his extreme regular-season usage and efficiency made the model expect a bigger playoff dropoff than actually happened.",
  },
];

const RESULTS = {
  trainN: 34,
  testN: 48,
  modelMAE: 2.49,
  baselineMAE: 2.42,
  modelR2: -0.04,
  trainR2: 0.34,
};

function FeatureBar({ name, value, max }) {
  const pct = (Math.abs(value) / max) * 100;
  const negative = value < 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-14 shrink-0 text-neutral-500">{name}</span>
      <div className="relative flex-1 h-4 bg-neutral-100 rounded">
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-neutral-300" />
        <div
          className={`absolute top-0 bottom-0 rounded ${negative ? "bg-red-400" : "bg-emerald-500"}`}
          style={{
            width: `${pct / 2}%`,
            left: negative ? `${50 - pct / 2}%` : "50%",
          }}
        />
      </div>
      <span className="w-12 shrink-0 text-right tabular-nums text-neutral-700">
        {value > 0 ? "+" : ""}
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function ScatterChart({ points, highlighted }) {
  const W = 520, H = 380, PAD = 40;
  const allX = points.map((p) => p[0]);
  const allY = points.map((p) => p[1]);
  const min = Math.min(...allX, ...allY) - 1;
  const max = Math.max(...allX, ...allY) + 1;
  const scale = (v) => PAD + ((v - min) / (max - min)) * (W - 2 * PAD);
  const scaleY = (v) => H - PAD - ((v - min) / (max - min)) * (H - 2 * PAD);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Scatter plot of predicted versus actual playoff BPM delta for 48 test players">
      <line x1={scale(min)} y1={scaleY(min)} x2={scale(max)} y2={scaleY(max)} stroke="#d4d4d4" strokeDasharray="4 4" />
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#a3a3a3" />
      <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#a3a3a3" />
      <text x={W / 2} y={H - 8} textAnchor="middle" className="fill-neutral-500" fontSize="11">
        Actual BPM delta
      </text>
      <text x={12} y={H / 2} textAnchor="middle" className="fill-neutral-500" fontSize="11" transform={`rotate(-90 12 ${H / 2})`}>
        Predicted BPM delta
      </text>
      {points.map(([x, y], i) => (
        <circle key={i} cx={scale(x)} cy={scaleY(y)} r="4" fill="#93c5fd" opacity="0.75" />
      ))}
      {highlighted.map((p, i) => (
        <g key={p.name}>
          <circle cx={scale(p.actual)} cy={scaleY(p.predicted)} r="6" fill="#1d4ed8" stroke="white" strokeWidth="1.5" />
          <text x={scale(p.actual) + 8} y={scaleY(p.predicted) - 6} fontSize="10" className="fill-neutral-700">
            {p.name.split(" ").pop()}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function PlayoffDeltaProject() {
  const [tab, setTab] = useState("overview");
  const maxCoef = Math.max(...FEATURES.map((f) => Math.abs(f.value)));

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 text-neutral-900">
      <p className="text-sm font-medium text-blue-600 mb-2">Data project</p>
      <h1 className="text-3xl font-bold mb-3">Playoff Performance Delta Predictor</h1>
      <p className="text-neutral-600 max-w-2xl mb-8">
        A linear regression model that predicts how an NBA player's efficiency (Box Plus/Minus)
        shifts between the regular season and the playoffs -- using only stats known before the
        playoffs start. Trained and evaluated on real, multi-season data with a season-based
        train/test split.
      </p>

      <div className="flex gap-2 mb-8 border-b border-neutral-200">
        {["overview", "results", "examples", "limitations"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm capitalize border-b-2 -mb-px transition-colors ${
              tab === t ? "border-blue-600 text-blue-600 font-medium" : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Train / test" value={`${RESULTS.trainN} / ${RESULTS.testN}`} sub="player-seasons" />
            <Stat label="Model MAE" value={`${RESULTS.modelMAE}`} sub="BPM, held-out test" />
            <Stat label="Baseline MAE" value={`${RESULTS.baselineMAE}`} sub="predict train mean" />
            <Stat label="Test R²" value={`${RESULTS.modelR2}`} sub="held-out season" />
          </div>
          <div className="prose prose-neutral max-w-none text-sm leading-relaxed text-neutral-700">
            <p>
              <strong>Data:</strong> Basketball-Reference "Advanced" stat tables, regular season and
              playoffs, 2021-22 and 2022-23 seasons. Players matched by name within season, filtered
              to at least 60 playoff minutes to remove one-game cameos.
            </p>
            <p>
              <strong>Split:</strong> trained only on the 2022 playoff cohort, evaluated only on the
              2023 cohort -- a time-based split, not random, so the model never sees the season it's
              scored on.
            </p>
            <p>
              <strong>Model:</strong> ordinary least squares linear regression on standardized
              features (age, usage rate, true shooting %, three-point rate, assist rate, turnover
              rate, regular-season BPM, win shares/48).
            </p>
          </div>
        </div>
      )}

      {tab === "results" && (
        <div className="space-y-10">
          <div>
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-4">
              Feature coefficients (standardized, trained on 2022 cohort)
            </h2>
            <div className="space-y-2.5">
              {FEATURES.map((f) => (
                <FeatureBar key={f.name} name={f.name} value={f.value} max={maxCoef} />
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-4">
              Predicted vs actual -- held-out 2023 test set
            </h2>
            <ScatterChart points={TEST_POINTS} highlighted={EXAMPLES} />
            <p className="text-xs text-neutral-400 mt-2">
              Dashed line = perfect prediction. Named points are covered in the Examples tab.
            </p>
          </div>
        </div>
      )}

      {tab === "examples" && (
        <div className="grid sm:grid-cols-2 gap-4">
          {EXAMPLES.map((p) => (
            <div key={p.name} className="border border-neutral-200 rounded-xl p-4">
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="font-semibold">{p.name}</h3>
                <span className="text-xs text-neutral-400">{p.pos}</span>
              </div>
              <div className="flex gap-4 text-sm mb-2">
                <span>
                  Actual: <strong className={p.actual >= 0 ? "text-emerald-600" : "text-red-500"}>{p.actual > 0 ? "+" : ""}{p.actual}</strong>
                </span>
                <span>
                  Predicted: <strong className={p.predicted >= 0 ? "text-emerald-600" : "text-red-500"}>{p.predicted > 0 ? "+" : ""}{p.predicted}</strong>
                </span>
              </div>
              <p className="text-sm text-neutral-600">{p.note}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "limitations" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-900 space-y-3">
          <p className="font-semibold">The model does not beat a naive baseline on held-out data.</p>
          <p>
            Model MAE ({RESULTS.modelMAE}) is not meaningfully better than simply predicting the
            training-set average for every player ({RESULTS.baselineMAE}), and test R² is negative.
            The model fits the training season reasonably well (R² {RESULTS.trainR2}) but that does
            not generalize -- a small-sample overfitting pattern, reported here rather than hidden.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Sample size is small: 34 train / 48 test player-seasons.</li>
            <li>No injury, matchup, or role-change context -- box scores alone can't see those.</li>
            <li>Survivorship bias: only players whose teams made the playoffs are included.</li>
            <li>More seasons of data, and non-linear models, are the natural next step.</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="bg-neutral-50 rounded-xl p-4">
      <p className="text-xs text-neutral-500 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-neutral-400">{sub}</p>
    </div>
  );
}
