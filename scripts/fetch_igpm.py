"""IGP-M: series 189 (monthly) + calculated 12-month and YTD cumulative."""

from utils import fetch_sgs, parse_month, calc_acum_ano, calc_acum_12m, save_json
from datetime import datetime


def main():
    print("Fetching IGP-M (series 189)...")
    raw = fetch_sgs(189)
    print(f"  {len(raw)} records")

    monthly = []
    monthly_for_calc = []
    for r in raw:
        mes = parse_month(r["data"])
        val = float(r["valor"])
        monthly.append({"data": mes, "variacao": val})
        monthly_for_calc.append({"data": mes, "valor": val})

    acum_ano = calc_acum_ano(monthly_for_calc)
    acum_12m = calc_acum_12m(monthly_for_calc)

    current = monthly[-1] if monthly else {}
    current_ytd = acum_ano[-1] if acum_ano else {}
    current_12m = acum_12m[-1] if acum_12m else {}

    save_json({
        "last_updated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "BCB/SGS-189",
        "current": {
            "variacao": current.get("variacao"),
            "acumulado_ano": current_ytd.get("valor"),
            "acumulado_12m": current_12m.get("valor"),
            "mes_referencia": current.get("data"),
        },
        "monthly": monthly,
        "acum_ano": acum_ano,
        "acum_12m": acum_12m,
    }, "igpm.json")


if __name__ == "__main__":
    main()
