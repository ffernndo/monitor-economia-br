"""CDI: series 12 (daily, p.a.) + series 4391 (month cumulative) → YTD and 12-month cumulative."""

from utils import fetch_sgs, parse_date, parse_month, calc_acum_ano, calc_acum_12m, save_json
from datetime import datetime


def main():
    print("Fetching daily CDI (series 12)...")
    raw_12 = fetch_sgs(12)
    print(f"  {len(raw_12)} records")

    # Last value of each month = rate p.a.
    by_month = {}
    for r in raw_12:
        mes = parse_date(r["data"])[:7]
        by_month[mes] = float(r["valor"])
    monthly = [{"data": m, "valor": v} for m, v in sorted(by_month.items())]

    print("Fetching CDI month cumulative (series 4391)...")
    raw_4391 = fetch_sgs(4391)
    print(f"  {len(raw_4391)} records")

    acum_mensal = [{"data": parse_month(r["data"]), "valor": float(r["valor"])} for r in raw_4391]

    acum_ano = calc_acum_ano(acum_mensal)
    acum_12m = calc_acum_12m(acum_mensal)

    current_taxa = monthly[-1] if monthly else {}
    current_ytd = acum_ano[-1] if acum_ano else {}
    current_12m = acum_12m[-1] if acum_12m else {}

    save_json({
        "last_updated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "BCB/SGS-12,4391",
        "current": {
            "taxa": current_taxa.get("valor"),
            "data": current_taxa.get("data"),
            "acum_ano": current_ytd.get("valor"),
            "acum_12m": current_12m.get("valor"),
        },
        "monthly": monthly,
        "acum_mensal": acum_mensal,
        "acum_ano": acum_ano,
        "acum_12m": acum_12m,
    }, "cdi.json")


if __name__ == "__main__":
    main()
