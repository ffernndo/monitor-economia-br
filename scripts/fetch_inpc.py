"""INPC: series 188 (monthly) + series 11426 (12-month cumulative) + calculated YTD."""

from utils import fetch_sgs, parse_month, calc_acum_ano, save_json
from datetime import datetime


def main():
    print("Fetching INPC monthly (series 188)...")
    raw_mensal = fetch_sgs(188)
    print(f"  {len(raw_mensal)} records")

    print("Fetching INPC 12m cumulative (series 11426)...")
    raw_acum = fetch_sgs(11426)
    print(f"  {len(raw_acum)} records")

    acum_map = {parse_month(r["data"]): float(r["valor"]) for r in raw_acum}

    monthly = []
    monthly_for_calc = []
    for r in raw_mensal:
        mes = parse_month(r["data"])
        val = float(r["valor"])
        entry = {"data": mes, "variacao": val}
        if mes in acum_map:
            entry["acumulado_12m"] = acum_map[mes]
        monthly.append(entry)
        monthly_for_calc.append({"data": mes, "valor": val})

    acum_ano = calc_acum_ano(monthly_for_calc)

    current = monthly[-1] if monthly else {}
    current_acum12 = next((m for m in reversed(monthly) if "acumulado_12m" in m), {})
    current_ytd = acum_ano[-1] if acum_ano else {}

    save_json({
        "last_updated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "BCB/SGS-188,11426",
        "current": {
            "mensal": current.get("variacao"),
            "acumulado_12m": current_acum12.get("acumulado_12m"),
            "acumulado_ano": current_ytd.get("valor"),
            "mes_referencia": current.get("data"),
        },
        "monthly": monthly,
        "acum_ano": acum_ano,
    }, "inpc.json")


if __name__ == "__main__":
    main()
