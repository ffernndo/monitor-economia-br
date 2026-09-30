"""Utility functions shared by the collection scripts."""

import json
import requests
from datetime import datetime
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
SGS_BASE = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{serie}/dados"


def fetch_sgs(serie, data_inicial="01/01/2020", data_final=None):
    if data_final is None:
        data_final = datetime.now().strftime("%d/%m/%Y")
    url = SGS_BASE.format(serie=serie)
    resp = requests.get(url, params={"formato": "json", "dataInicial": data_inicial, "dataFinal": data_final}, timeout=30)
    resp.raise_for_status()
    return resp.json()


def parse_month(d):
    return datetime.strptime(d, "%d/%m/%Y").strftime("%Y-%m")


def parse_date(d):
    return datetime.strptime(d, "%d/%m/%Y").strftime("%Y-%m-%d")


def calc_acum_ano(monthly_values):
    """Calculates the year-to-date cumulative by compounding. Input: [{'data':'YYYY-MM', 'valor': float}]"""
    result = []
    ytd = 1.0
    last_year = None
    for m in sorted(monthly_values, key=lambda x: x['data']):
        year = m['data'][:4]
        if year != last_year:
            ytd = 1.0
            last_year = year
        ytd *= (1 + m['valor'] / 100)
        result.append({"data": m['data'], "valor": round((ytd - 1) * 100, 2)})
    return result


def calc_acum_12m(monthly_values):
    """Calculates the 12-month cumulative by compounding (rolling window)."""
    sorted_vals = sorted(monthly_values, key=lambda x: x['data'])
    result = []
    for i in range(11, len(sorted_vals)):
        prod = 1.0
        for j in range(i - 11, i + 1):
            prod *= (1 + sorted_vals[j]['valor'] / 100)
        result.append({"data": sorted_vals[i]['data'], "valor": round((prod - 1) * 100, 2)})
    return result


def save_json(data, filename):
    filepath = DATA_DIR / filename
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    filepath.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    print(f"Saved to {filepath}")
