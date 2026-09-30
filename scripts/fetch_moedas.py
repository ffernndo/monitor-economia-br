"""
Collects currency quotes from the Central Bank PTAX API.
USD, EUR and GBP → saved to data/moedas.json
"""

import json
import requests
from datetime import datetime, timedelta
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
OUTPUT = DATA_DIR / "moedas.json"

# USD uses its own endpoint, EUR/GBP use the generic one
PTAX_USD = (
    "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/"
    "CotacaoDolarPeriodo(dataInicial=@di,dataFinalCotacao=@df)"
    "?@di='{di}'&@df='{df}'&$format=json&$orderby=dataHoraCotacao asc"
)

PTAX_MOEDA = (
    "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/"
    "CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@di,dataFinalCotacao=@df)"
    "?@moeda='{moeda}'&@di='{di}'&@df='{df}'&$format=json&$orderby=dataHoraCotacao asc"
)

MOEDAS = {
    "usd": {"nome": "US Dollar (USD)", "codigo": None},  # own endpoint
    "eur": {"nome": "Euro (EUR)", "codigo": "EUR"},
    "gbp": {"nome": "Pound (GBP)", "codigo": "GBP"},
    "chf": {"nome": "Swiss Franc (CHF)", "codigo": "CHF"},
    "cad": {"nome": "Canadian Dollar (CAD)", "codigo": "CAD"},
}


def fetch_usd(di, df):
    url = PTAX_USD.format(di=di, df=df)
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.json()["value"]


def fetch_moeda(codigo, di, df):
    url = PTAX_MOEDA.format(moeda=codigo, di=di, df=df)
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.json()["value"]


def one_per_day(records):
    by_day = {}
    for r in records:
        dt = r["dataHoraCotacao"][:10]
        by_day[dt] = r
    return [by_day[k] for k in sorted(by_day)]


def process_currency(raw_records):
    """Processes raw records into daily and monthly history."""
    daily = one_per_day(raw_records)

    history = []
    for r in daily:
        history.append({
            "data": r["dataHoraCotacao"][:10],
            "venda": round(r["cotacaoVenda"], 4),
        })

    # Monthly aggregation (month-end close)
    by_month = {}
    for h in history:
        mes = h["data"][:7]
        by_month[mes] = h["venda"]

    monthly = [{"data": m, "valor": v} for m, v in sorted(by_month.items())]

    current = history[-1] if history else None

    # Changes
    variations = {}
    if len(history) >= 2:
        cur = history[-1]["venda"]
        prev = history[-2]["venda"]
        variations["day"] = round((cur - prev) / prev * 100, 2)

    return {
        "current": {"cotacao_venda": current["venda"], "data": current["data"]} if current else None,
        "variations": variations,
        "monthly": monthly,
    }


def main():
    today = datetime.now()
    di = "01-01-2020"
    df = today.strftime("%m-%d-%Y")

    result = {
        "last_updated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "BCB/PTAX",
    }

    for key, cfg in MOEDAS.items():
        print(f"Fetching {cfg['nome']}...")
        try:
            if cfg["codigo"] is None:
                raw = fetch_usd(di, df)
            else:
                raw = fetch_moeda(cfg["codigo"], di, df)
            print(f"  {len(raw)} raw records")
            result[key] = process_currency(raw)
            result[key]["nome"] = cfg["nome"]
            print(f"  {len(result[key]['monthly'])} months")
        except Exception as e:
            print(f"  ERROR: {e}")
            result[key] = {"nome": cfg["nome"], "current": None, "variations": {}, "monthly": []}

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"Saved to {OUTPUT}")


if __name__ == "__main__":
    main()
