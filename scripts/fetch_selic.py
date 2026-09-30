"""Selic: series 432 (target) + series 11 (effective)."""

from utils import fetch_sgs, parse_date, save_json
from datetime import datetime


def compact_monthly(records):
    """Last value of each month."""
    by_month = {}
    for r in records:
        dt = parse_date(r["data"])
        mes = dt[:7]
        by_month[mes] = float(r["valor"])
    return [{"data": m, "taxa": v} for m, v in sorted(by_month.items())]


def detect_copom(records):
    decisions = []
    for i in range(1, len(records)):
        t_ant = float(records[i - 1]["valor"])
        t_nova = float(records[i]["valor"])
        if t_nova != t_ant:
            var = round(t_nova - t_ant, 2)
            decisions.append({
                "data": parse_date(records[i]["data"]),
                "taxa_anterior": t_ant, "taxa_nova": t_nova,
                "variacao": var, "direcao": "alta" if var > 0 else "corte",
            })
    return decisions


def main():
    print("Fetching Selic target (series 432)...")
    raw_meta = fetch_sgs(432)
    print(f"  {len(raw_meta)} records")

    print("Fetching effective Selic (series 11)...")
    raw_efetiva = fetch_sgs(11)
    print(f"  {len(raw_efetiva)} records")

    meta_monthly = compact_monthly(raw_meta)
    efetiva_monthly = compact_monthly(raw_efetiva)
    decisions = detect_copom(raw_meta)

    current_meta = meta_monthly[-1] if meta_monthly else {}
    current_efetiva = efetiva_monthly[-1] if efetiva_monthly else {}

    save_json({
        "last_updated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "BCB/SGS-432,11",
        "current": {
            "meta": current_meta.get("taxa"),
            "efetiva": current_efetiva.get("taxa"),
            "data": current_meta.get("data"),
        },
        "copom_decisions": list(reversed(decisions)),
        "meta_monthly": meta_monthly,
        "efetiva_monthly": efetiva_monthly,
    }, "selic.json")


if __name__ == "__main__":
    main()
