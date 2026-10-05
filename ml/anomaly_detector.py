"""
ASTRA-SHIELD
AI-Driven Anomaly Detection in Component Burn-In and Screening

This module detects:
1. Absolute specification violations
2. Lot-level abnormal behavior
3. Early degradation/drift
4. Reliability risk

Demo-ready synthetic engineering logic.
"""

from __future__ import annotations

from typing import Dict, List

import numpy as np
import pandas as pd



# ---------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------

SAFETY_LIMITS = {
    "Leakage Current": 50.0,
    "Iddq": 25.0,
    "Standby Current": 30.0,
    "Propagation Delay": 15.0,
}


# ---------------------------------------------------------
# SAMPLE BURN-IN DATA
# ---------------------------------------------------------

BURN_IN_DATA = [
    {
        "component_id": "AST-24-00871",
        "lot_id": "LOT-24A",
        "parameter": "Leakage Current",
        "temperature": 85,
        "value_0h": 9.8,
        "value_24h": 14.8,
        "value_96h": 31.7,
        "value_168h": 56.2,
    },
    {
        "component_id": "AST-24-00318",
        "lot_id": "LOT-24A",
        "parameter": "Iddq",
        "temperature": 85,
        "value_0h": 10.8,
        "value_24h": 12.8,
        "value_96h": 15.9,
        "value_168h": 19.7,
    },
    {
        "component_id": "AST-25-00142",
        "lot_id": "LOT-25B",
        "parameter": "Propagation Delay",
        "temperature": 70,
        "value_0h": 8.4,
        "value_24h": 8.5,
        "value_96h": 8.8,
        "value_168h": 9.1,
    },
    {
        "component_id": "AST-25-00491",
        "lot_id": "LOT-25B",
        "parameter": "Standby Current",
        "temperature": 85,
        "value_0h": 8.8,
        "value_24h": 11.4,
        "value_96h": 14.7,
        "value_168h": 17.9,
    },
    {
        "component_id": "AST-24-00912",
        "lot_id": "LOT-24A",
        "parameter": "Leakage Current",
        "temperature": 85,
        "value_0h": 9.9,
        "value_24h": 10.4,
        "value_96h": 10.8,
        "value_168h": 11.2,
    },
]


# ---------------------------------------------------------
# DATAFRAME
# ---------------------------------------------------------

df = pd.DataFrame(BURN_IN_DATA)


# ---------------------------------------------------------
# FEATURE ENGINEERING
# ---------------------------------------------------------

def calculate_features(row: pd.Series) -> Dict[str, float]:
    """
    Calculate engineering features from burn-in measurements.
    """

    initial = float(row["value_0h"])
    value_24h = float(row["value_24h"])
    value_96h = float(row["value_96h"])
    endpoint = float(row["value_168h"])

    early_drift = ((value_24h - initial) / max(abs(initial), 0.001)) * 100

    total_drift = ((endpoint - initial) / max(abs(initial), 0.001)) * 100

    late_drift = ((endpoint - value_96h) / max(abs(value_96h), 0.001)) * 100

    safety_limit = SAFETY_LIMITS.get(
        row["parameter"],
        endpoint * 1.5,
    )

    limit_utilization = (endpoint / safety_limit) * 100

    return {
        "early_drift": round(early_drift, 2),
        "total_drift": round(total_drift, 2),
        "late_drift": round(late_drift, 2),
        "limit_utilization": round(limit_utilization, 2),
        "endpoint": endpoint,
    }


# ---------------------------------------------------------
# LOT DEVIATION
# ---------------------------------------------------------

def calculate_lot_deviation(
    dataframe: pd.DataFrame,
    row: pd.Series,
) -> float:
    """
    Robustly estimate how different a component is from
    the rest of its production lot.

    The result behaves similarly to a robust Z-score.
    """

    same_lot = dataframe[
        (dataframe["lot_id"] == row["lot_id"])
        & (dataframe["parameter"] == row["parameter"])
    ]

    if len(same_lot) <= 1:
        return 0.0

    values = same_lot["value_24h"].astype(float)

    median = float(values.median())

    mad = float(
        np.median(
            np.abs(values - median)
        )
    )

    if mad < 0.0001:
        return 0.0

    deviation = abs(
        float(row["value_24h"]) - median
    ) / (1.4826 * mad)

    return round(float(deviation), 2)


# ---------------------------------------------------------
# ISOLATION FOREST
# ---------------------------------------------------------

def isolation_score(
    dataframe: pd.DataFrame,
    row: pd.Series,
) -> float:
    """
    Lightweight trajectory anomaly score.

    Compares the component's burn-in trajectory against
    the overall dataset without requiring compiled ML binaries.
    """

    feature_columns = [
        "value_0h",
        "value_24h",
        "value_96h",
        "value_168h",
    ]

    X = dataframe[feature_columns].astype(float)

    sample = row[feature_columns].astype(float).to_numpy()

    means = X.mean(axis=0).to_numpy()
    stds = X.std(axis=0).to_numpy()

    # Prevent division by zero when all values are identical.
    stds = np.where(stds < 0.0001, 1.0, stds)

    z_scores = np.abs((sample - means) / stds)

    average_deviation = float(np.mean(z_scores))

    anomaly_score = np.clip(
        average_deviation * 20,
        0,
        100,
    )

    return round(float(anomaly_score), 2)

# ---------------------------------------------------------
# RELIABILITY RISK
# ---------------------------------------------------------

def calculate_risk(
    features: Dict[str, float],
    lot_deviation: float,
    anomaly_score: float,
) -> int:
    """
    Combine multiple engineering indicators into
    a 0–100 reliability risk score.
    """

    early_drift_score = np.clip(
        features["early_drift"] * 1.3,
        0,
        35,
    )

    lot_score = np.clip(
        lot_deviation * 8,
        0,
        25,
    )

    endpoint_score = np.clip(
        features["limit_utilization"] - 50,
        0,
        30,
    )

    anomaly_component = np.clip(
        anomaly_score * 0.10,
        0,
        10,
    )

    risk = (
        early_drift_score
        + lot_score
        + endpoint_score
        + anomaly_component
    )

    return int(np.clip(round(risk), 0, 100))


# ---------------------------------------------------------
# STATUS
# ---------------------------------------------------------

def get_status(risk: int) -> str:

    if risk >= 80:
        return "Critical"

    if risk >= 60:
        return "Warning"

    if risk >= 30:
        return "Watch"

    return "Normal"


# ---------------------------------------------------------
# ANALYZE COMPONENT
# ---------------------------------------------------------

def analyze_component(
    component_id: str,
) -> Dict:

    matches = df[
        df["component_id"] == component_id
    ]

    if matches.empty:
        raise ValueError(
            f"Component {component_id} not found."
        )

    row = matches.iloc[0]

    features = calculate_features(row)

    lot_deviation = calculate_lot_deviation(
        df,
        row,
    )

    anomaly_score = isolation_score(
        df,
        row,
    )

    risk = calculate_risk(
        features,
        lot_deviation,
        anomaly_score,
    )

    status = get_status(risk)

    safety_limit = SAFETY_LIMITS.get(
        row["parameter"],
        features["endpoint"] * 1.5,
    )

    return {
        "component_id": component_id,
        "lot_id": row["lot_id"],
        "parameter": row["parameter"],
        "temperature": row["temperature"],
        "current_value": float(row["value_24h"]),
        "predicted_168h": features["endpoint"],
        "safety_limit": safety_limit,
        "early_drift_percent": features["early_drift"],
        "total_drift_percent": features["total_drift"],
        "lot_deviation_sigma": lot_deviation,
        "anomaly_score": anomaly_score,
        "reliability_risk": risk,
        "status": status,
        "within_current_spec": (
            float(row["value_24h"]) < safety_limit
        ),
    }


# ---------------------------------------------------------
# COMMAND LINE TEST
# ---------------------------------------------------------

if __name__ == "__main__":

    print("\nASTRA-SHIELD AI ANALYSIS")
    print("=" * 50)

    result = analyze_component(
        "AST-24-00871"
    )

    for key, value in result.items():
        print(
            f"{key:25}: {value}"
        )

    print("=" * 50)