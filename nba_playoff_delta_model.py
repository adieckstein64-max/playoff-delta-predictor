"""
Playoff Performance Delta Predictor
------------------------------------
Predicts how an NBA player's efficiency (Box Plus/Minus, BPM) changes from the
regular season to the playoffs, using ONLY features available before the
playoffs start (i.e. that player's regular-season advanced stats).

Data source: basketball-reference.com, "Advanced" stat tables, seasons 2022
and 2023 (regular season + playoffs), joined by player name within season.

Model: a real, fitted linear regression (numpy least-squares / normal
equations) -- NOT a hardcoded per-player lookup table. Train/test split is by
SEASON (train on 2022 player-seasons, test on 2023 player-seasons) rather than
random, to avoid leaking information across the split and to simulate how the
model would actually be used: predict next season's playoff delta from stats
you already have.

Run: python3 nba_playoff_delta_model.py
"""
import pandas as pd
import numpy as np

FEATURES = ['age', 'USG%', 'TS%', '3PAr', 'AST%', 'TOV%', 'BPM', 'WS48']
MIN_PLAYOFF_MINUTES = 60  # filter out garbage-time/one-game cameos

def build_dataset(reg_path, po_path, season):
    reg = pd.read_csv(reg_path)
    po = pd.read_csv(po_path)
    po = po[po['MP'] >= MIN_PLAYOFF_MINUTES].copy()
    merged = reg.merge(po, on='name', suffixes=('_reg', '_po'))
    merged['season'] = season
    merged['bpm_delta'] = merged['BPM_po'] - merged['BPM_reg']
    out = pd.DataFrame()
    out['name'] = merged['name']
    out['season'] = season
    out['age'] = merged['age_reg']
    out['pos'] = merged['pos_reg']
    for f in FEATURES:
        if f == 'age':
            continue
        out[f] = merged[f + '_reg']
    out['reg_BPM'] = merged['BPM_reg']
    out['playoff_BPM'] = merged['BPM_po']
    out['playoff_MP'] = merged['MP_po']
    out['bpm_delta'] = merged['bpm_delta']
    return out.dropna()

train_df = build_dataset('parsed_reg22.csv', 'parsed_po22.csv', 2022)
test_df  = build_dataset('parsed_reg23.csv', 'parsed_po23.csv', 2023)

print(f"Train (2022 playoff cohort): {len(train_df)} player-seasons")
print(f"Test  (2023 playoff cohort): {len(test_df)} player-seasons")

X_train = train_df[FEATURES].values.astype(float)
y_train = train_df['bpm_delta'].values.astype(float)
X_test  = test_df[FEATURES].values.astype(float)
y_test  = test_df['bpm_delta'].values.astype(float)

# standardize features (helps interpret coefficients as relative importance)
mu, sigma = X_train.mean(axis=0), X_train.std(axis=0)
sigma[sigma == 0] = 1.0
X_train_s = (X_train - mu) / sigma
X_test_s  = (X_test - mu) / sigma

# add intercept column, fit via least squares (normal equations)
X_train_i = np.column_stack([np.ones(len(X_train_s)), X_train_s])
X_test_i  = np.column_stack([np.ones(len(X_test_s)), X_test_s])

coefs, residuals, rank, sv = np.linalg.lstsq(X_train_i, y_train, rcond=None)
intercept, weights = coefs[0], coefs[1:]

pred_train = X_train_i @ coefs
pred_test  = X_test_i @ coefs

def mae(y, yhat): return np.mean(np.abs(y - yhat))
def r2(y, yhat):
    ss_res = np.sum((y - yhat) ** 2)
    ss_tot = np.sum((y - y.mean()) ** 2)
    return 1 - ss_res / ss_tot if ss_tot > 0 else float('nan')

baseline_pred = np.full_like(y_test, y_train.mean())

print("\n--- Results (test = 2023 playoff cohort, held out) ---")
print(f"Model  MAE: {mae(y_test, pred_test):.3f} BPM   R2: {r2(y_test, pred_test):.3f}")
print(f"Baseline (predict train mean {y_train.mean():.3f}) MAE: {mae(y_test, baseline_pred):.3f} BPM   R2: {r2(y_test, baseline_pred):.3f}")
print(f"\nTrain-set fit -- MAE: {mae(y_train, pred_train):.3f}  R2: {r2(y_train, pred_train):.3f}")

print("\n--- Feature coefficients (on standardized features; larger |value| = more influence) ---")
coef_table = pd.DataFrame({'feature': FEATURES, 'coefficient': weights}).sort_values('coefficient', key=abs, ascending=False)
print(coef_table.to_string(index=False))
print(f"\nIntercept: {intercept:.3f}")

# save everything
full = pd.concat([
    train_df.assign(split='train'),
    test_df.assign(split='test'),
], ignore_index=True)
full.to_csv('nba_playoff_delta_dataset.csv', index=False)
coef_table.to_csv('feature_coefficients.csv', index=False)

test_out = test_df.copy()
test_out['predicted_bpm_delta'] = pred_test
test_out['error'] = test_out['bpm_delta'] - test_out['predicted_bpm_delta']
test_out.to_csv('test_predictions.csv', index=False)

# charts
try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(7, 5))
    colors = ['#2a9d8f' if c > 0 else '#e76f51' for c in coef_table['coefficient']]
    ax.barh(coef_table['feature'], coef_table['coefficient'], color=colors)
    ax.axvline(0, color='black', linewidth=0.8)
    ax.set_xlabel('Standardized coefficient (impact on predicted playoff BPM delta)')
    ax.set_title('Feature Importance -- Playoff Performance Delta Model')
    plt.tight_layout()
    plt.savefig('feature_importance.png', dpi=150)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(6, 6))
    ax.scatter(y_test, pred_test, alpha=0.7, color='#264653')
    lims = [min(y_test.min(), pred_test.min()) - 1, max(y_test.max(), pred_test.max()) + 1]
    ax.plot(lims, lims, '--', color='gray', linewidth=1)
    ax.set_xlabel('Actual playoff BPM delta (2023)')
    ax.set_ylabel('Predicted playoff BPM delta')
    ax.set_title('Predicted vs Actual -- Held-out Test Season (2023)')
    plt.tight_layout()
    plt.savefig('predicted_vs_actual.png', dpi=150)
    plt.close(fig)
    print("\nSaved charts: feature_importance.png, predicted_vs_actual.png")
except ImportError:
    print("\nmatplotlib not available, skipped charts")

print("\nSaved: nba_playoff_delta_dataset.csv, feature_coefficients.csv, test_predictions.csv")
