# Playoff Performance Delta Predictor

A small, honest regression model that predicts how much an NBA player's efficiency (Box Plus/Minus, BPM) changes between the regular season and the playoffs, using only stats known before the playoffs start.

## Why this project exists

This replaces an earlier project ("Viziballr") whose headline feature -- an "AI Predicted" score for playoff performance -- was actually a hardcoded JavaScript object with hand-picked multipliers for seven star players. It looked like a model but wasn't one. This project fixes that specific problem: every prediction here comes from a real fitted linear regression, evaluated on data the model never saw during training. No player-specific lookup tables anywhere in the pipeline.

## The question

Some players elevate in the playoffs; others shrink under tighter defense and playoff pressure. Can a player's regular-season profile (age, usage, shooting efficiency, turnover rate, overall BPM) predict which way -- and by how much -- their efficiency will move once the playoffs start?

## Data

Source: [Basketball-Reference](https://www.basketball-reference.com), "Advanced" stat tables, regular season and playoffs, for the 2021-22 and 2022-23 NBA seasons. Players were matched by name within each season, and joined only if they logged at least 60 playoff minutes (to filter out one-game cameos and garbage time that make BPM meaningless).

- **Train set: 2022 playoff cohort -- 34 player-seasons**
- **Test set: 2023 playoff cohort -- 48 player-seasons**

The split is by season, not random: the model is trained only on 2022 data and evaluated only on 2023 data it never saw. This mirrors how the model would actually be used (predict this year's playoff shift from stats you already have) and avoids leaking information across the split.

**On sample size:** 34 and 48 player-seasons is small. This is a real limitation, not a rounding error -- with samples this size, individual outlier performances (a role player having one hot week, a star getting hurt) can swing the results noticeably. A production version of this would need many more seasons of matched data.

## Features

Age, usage rate (USG%), true shooting (TS%), three-point attempt rate (3PAr), assist rate (AST%), turnover rate (TOV%), regular-season BPM, and win shares per 48 (WS/48) -- all from the regular season only. Playoff-derived stats were deliberately excluded from the feature set to avoid data leakage (predicting the target from itself).

Note: OBPM and DBPM were dropped from the feature set because BPM is defined as OBPM + DBPM -- including all three caused severe multicollinearity (unstable, meaningless coefficients). Keeping BPM alone avoids that.

## Model

Linear regression, fit via least squares (numpy, normal equations) on standardized features. No external ML library was needed or used for the fit itself.

## Results

| | MAE (BPM) | R² |
|---|---|---|
| Model, on held-out 2023 test set | 2.49 | -0.04 |
| Naive baseline (predict the training mean for everyone) | 2.42 | -0.02 |
| Model, on training data (2022) | 1.91 | 0.34 |

**The model does not beat the naive baseline on held-out data.** This is worth stating plainly rather than spinning: with this sample size and feature set, regular-season stats alone don't reliably predict the direction or size of a player's playoff efficiency swing. The model fits the training season reasonably well (R²=0.34) but that doesn't generalize to a new season -- a classic small-sample overfitting pattern, and an honest one to report. Predicted-vs-actual for the test season (see `predicted_vs_actual.png`) shows the predictions clustered much closer to zero than the actual outcomes, which vary far more widely than the model captures.

This is a legitimate empirical finding, not a failure of the exercise: it demonstrates the actual difficulty of the problem, and that difference between "fits the training data" and "generalizes to new data" is exactly the distinction the earlier hardcoded-dictionary approach glossed over entirely.

## Feature importance

See `feature_importance.png` / `feature_coefficients.csv`. On the training data, TS% and USG% had the largest (negative) standardized coefficients -- suggesting that in this sample, players with very high regular-season usage and efficiency had a harder time sustaining that same level in the playoffs (regression to the mean against tougher defenses), while WS/48 and AST% had positive coefficients. Given the model's poor out-of-sample performance, these coefficients should be read as descriptive of the training season, not as reliable predictive signal.

## What would make this better

- More seasons of data (5-10 years) to shrink the noise in the estimates
- Team-level context: opponent defensive rating, round reached, home/away split
- Injury and role-change flags, which regular-season box stats can't capture
- A non-linear model (random forest / gradient boosting) once there's enough data to support one without overfitting further

## Files in this folder

- `nba_playoff_delta_model.py` -- the full, reproducible pipeline: load data, build features, fit the model, evaluate, save charts
- `parse_data.py` -- parses the raw Basketball-Reference text/table dumps into clean CSVs
- `nba_playoff_delta_dataset.csv` -- the final joined dataset (train + test, with a `split` column)
- `test_predictions.csv` -- per-player predictions vs actual outcomes on the 2023 test set
- `feature_coefficients.csv`, `feature_importance.png` -- model coefficients
- `predicted_vs_actual.png` -- scatter of predicted vs actual test-set outcomes
- `parsed_reg22.csv`, `parsed_reg23.csv`, `parsed_po22.csv`, `parsed_po23.csv`, `parsed_po24.csv` -- intermediate parsed data (2024 playoffs collected but unused in the final model since matching 2024 regular-season data wasn't collected -- noted here rather than silently dropped)

To reproduce: `python3 parse_data.py && python3 nba_playoff_delta_model.py`
