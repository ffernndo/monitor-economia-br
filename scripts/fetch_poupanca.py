"""Savings account: series 25 (monthly yield) + calculated YTD and 12-month cumulative."""

from utils import fetch_sgs, parse_month, calc_acum_ano, calc_acum_12m, save_json
from datetime import datetime


def main():
    print("Fetching savings rate (series 25)...")
    raw = fetch_sgs(25)
    print(f"  {len(raw)} records")

    # Series 25 has several records per month (deposit anniversaries).
    # Keep only the last value of each month.
    by_month = {}
    for r in raw:
        mes = parse_month(r["data"])
        by_month[mes] = float(r["valor"])
    monthly = [{"data": m, "valor": v} for m, v in sorted(by_month.items())]

    acum_ano = calc_acum_ano(monthly)
    acum_12m = calc_acum_12m(monthly)

    current = monthly[-1] if monthly else {}
    current_ytd = acum_ano[-1] if acum_ano else {}
    current_12m = acum_12m[-1] if acum_12m else {}

    save_json({
        "last_updated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "BCB/SGS-25",
        "current": {
            "rendimento": current.get("valor"),
            "acumulado_ano": current_ytd.get("valor"),
            "acumulado_12m": current_12m.get("valor"),
            "mes_referencia": current.get("data"),
        },
        "monthly": monthly,
        "acum_ano": acum_ano,
        "acum_12m": acum_12m,
    }, "poupanca.json")


if __name__ == "__main__":
    main()
