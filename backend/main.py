#!/usr/bin/env python3
"""
Diet Tracker API — FastAPI backend.
Serves 6 endpoints for diet dashboard:
  - GET /today         (card: calories + protein)
  - GET /calories-7d   (line graph)
  - GET /protein-7d    (line graph)
  - GET /weight-bf-7d  (line graph)
  - GET /macros-today  (pie chart)
  - GET /health        (health check)
"""
import os, json, math
from datetime import date, timedelta
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# ── BigQuery ──
SA_KEY = "/home/rezagiovanni/diet/service/diet_webapp_key.json"
PROJECT = "data-gym-480909"
DATASET = "diet"
TDEE_FALLBACK = 2035

def get_tdee():
    """Ambil TDEE terbaru dari daily_measure."""
    try:
        rows = _bq().query(f"SELECT tdee FROM `{PROJECT}.{DATASET}.daily_measure` WHERE tdee IS NOT NULL AND tdee > 0 ORDER BY ts DESC LIMIT 1").result()
        for r in rows:
            return float(r.tdee)
    except: pass
    # fallback: hitung dari data terakhir
    try:
        rows = _bq().query(f"SELECT weight_kg, height_cm, bmr FROM `{PROJECT}.{DATASET}.daily_measure` WHERE weight_kg IS NOT NULL ORDER BY ts DESC LIMIT 1").result()
        for r in rows:
            w, h, bmr = float(r.weight_kg), float(r.height_cm), float(r.bmr or 0)
            if bmr > 0: return round(bmr * 1.2, 0)
            return round((10 * w + 6.25 * h - 5 * 33 + 5) * 1.2, 0)
    except: pass
    return TDEE_FALLBACK

_client = None
def _bq():
    global _client
    if _client is None:
        from google.cloud import bigquery
        from google.oauth2 import service_account
        creds = service_account.Credentials.from_service_account_file(SA_KEY)
        _client = bigquery.Client(credentials=creds, project=PROJECT)
    return _client

def _q(sql):
    try:
        rows = _bq().query(sql).result()
        return [dict(r) for r in rows]
    except Exception as e:
        return []
def _today(): return date.today().isoformat()
def _week(): d = date.today(); return [(d - timedelta(days=i)).isoformat() for i in range(6, -1, -1)]

# ── FastAPI ──
app = FastAPI(title="Diet Tracker API", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
def health():
    return {"status": "ok", "project": PROJECT, "dataset": DATASET}

@app.get("/today")
def today():
    t = _today()
    rows = _q(f"""
        SELECT COALESCE(SUM(kcal),0) kcal, COALESCE(SUM(protein_g),0) protein,
               1300 target_kcal, 90 target_protein
        FROM `{PROJECT}.{DATASET}.food_entries` WHERE DATE(ts)='{t}'
    """)
    r = rows[0] if rows else {}
    return {"date": t,
            "calories":  {"total": int(r.get("kcal",0)), "target": r.get("target_kcal",1300)},
            "protein":   {"total": round(r.get("protein",0),1), "target": r.get("target_protein",90)}}

@app.get("/calories-7d")
def calories_7d():
    days = _week(); dl = ",".join(f"'{d}'" for d in days)
    rows = _q(f"SELECT DATE(ts) d, COALESCE(SUM(kcal),0) kcal FROM `{PROJECT}.{DATASET}.food_entries` WHERE DATE(ts) IN ({dl}) GROUP BY d ORDER BY d")
    data = {r["d"].isoformat(): int(r["kcal"]) for r in rows}
    return {"labels": days, "values": [data.get(d,0) for d in days]}

@app.get("/protein-7d")
def protein_7d():
    days = _week(); dl = ",".join(f"'{d}'" for d in days)
    rows = _q(f"SELECT DATE(ts) d, COALESCE(SUM(protein_g),0) protein FROM `{PROJECT}.{DATASET}.food_entries` WHERE DATE(ts) IN ({dl}) GROUP BY d ORDER BY d")
    data = {r["d"].isoformat(): round(r["protein"],1) for r in rows}
    return {"labels": days, "values": [data.get(d,0) for d in days]}

@app.get("/deficit-7d")
def deficit_7d():
    days = _week(); dl = ",".join(f"'{d}'" for d in days)
    rows = _q(f"SELECT DATE(ts) d, COALESCE(SUM(kcal),0) kcal FROM `{PROJECT}.{DATASET}.food_entries` WHERE DATE(ts) IN ({dl}) GROUP BY d ORDER BY d")
    tdee_val = get_tdee()
    data = {r["d"].isoformat(): int(tdee_val - int(r["kcal"])) for r in rows}
    pcts = {k: round(v / tdee_val * 100, 1) for k, v in data.items()}
    return {"labels": days, "values": [data.get(d,0) for d in days], "pcts": [pcts.get(d,0) for d in days], "tdee": int(tdee_val)}

@app.get("/weight-bf-7d")
def weight_bf_7d():
    days = _week(); dl = ",".join(f"'{d}'" for d in days)
    rows = _q(f"SELECT DATE(ts) d, weight_kg, body_fat_pct FROM `{PROJECT}.{DATASET}.daily_measure` WHERE DATE(ts) IN ({dl}) ORDER BY d")
    data = {r["d"].isoformat(): (r["weight_kg"], r["body_fat_pct"]) for r in rows}
    return {"labels": days,
            "weight": [data.get(d,(None,None))[0] for d in days],
            "body_fat": [data.get(d,(None,None))[1] for d in days]}

@app.get("/macros-today")
def macros_today():
    t = _today()
    rows = _q(f"SELECT COALESCE(SUM(protein_g),0) p, COALESCE(SUM(carbs_g),0) c, COALESCE(SUM(fat_g),0) f FROM `{PROJECT}.{DATASET}.food_entries` WHERE DATE(ts)='{t}'")
    r = rows[0] if rows else {}
    return {"labels": ["Protein","Carbs","Fat"], "values": [round(r.get("p",0),1), round(r.get("c",0),1), round(r.get("f",0),1)]}

@app.get("/today-foods")
def today_foods():
    """Detail makanan hari ini + kontribusi %, grouped by food name."""
    t = _today()
    rows = _q(f"SELECT food, SUM(grams) grams, SUM(kcal) kcal, SUM(protein_g) protein_g, SUM(carbs_g) carbs_g, SUM(fat_g) fat_g FROM `{PROJECT}.{DATASET}.food_entries` WHERE DATE(ts)='{t}' GROUP BY food ORDER BY SUM(protein_g) DESC")
    items = []
    totals = {"kcal": 0, "protein": 0, "carbs": 0, "fat": 0}
    for r in rows:
        items.append(dict(food=r["food"], grams=float(r["grams"]), kcal=round(float(r["kcal"]),1),
            protein=round(float(r.get("protein_g",0)),1),
            carbs=round(float(r.get("carbs_g",0)),1),
            fat=round(float(r.get("fat_g",0)),1)))
        totals["kcal"] += items[-1]["kcal"]
        totals["protein"] += items[-1]["protein"]
        totals["carbs"] += items[-1]["carbs"]
        totals["fat"] += items[-1]["fat"]
    for it in items:
        it["kcal_pct"] = round(it["kcal"]/totals["kcal"]*100,1) if totals["kcal"] else 0
        it["protein_pct"] = round(it["protein"]/totals["protein"]*100,1) if totals["protein"] else 0
        it["carbs_pct"] = round(it["carbs"]/totals["carbs"]*100,1) if totals["carbs"] else 0
        it["fat_pct"] = round(it["fat"]/totals["fat"]*100,1) if totals["fat"] else 0
    items.sort(key=lambda x: x["protein_pct"], reverse=True)
    return {"date": t, "items": items}

@app.get("/protein-tips")
def protein_tips():
    t = _today()
    tdee = get_tdee()
    food_rows = _q(f"SELECT food, kcal_per_100g, protein_per_100g FROM `{PROJECT}.{DATASET}.food_db` WHERE kcal_per_100g>0 AND protein_per_100g>0 ORDER BY protein_per_100g DESC")
    intake_rows = _q(f"SELECT COALESCE(SUM(kcal),0) k, COALESCE(SUM(protein_g),0) p FROM `{PROJECT}.{DATASET}.food_entries` WHERE DATE(ts)='{t}'")
    intake = intake_rows[0] if intake_rows else {}
    kcal_used = float(intake.get("k",0) or 0)
    protein_used = float(intake.get("p",0) or 0)
    remaining_kcal = max(0, tdee - kcal_used)
    remaining_protein = max(0, 90 - protein_used)

    suggestions = []
    for r in food_rows:
        food = r.get("food")
        kcal100 = float(r.get("kcal_per_100g",0) or 0)
        prot100 = float(r.get("protein_per_100g",0) or 0)
        if kcal100 <= 0 or prot100 <= 0:
            continue
        max_by_kcal = remaining_kcal / kcal100 * 100
        max_to_target = remaining_protein / prot100 * 100 if remaining_protein > 0 else 0
        if max_to_target > 0:
            portion = min(max_by_kcal, max_to_target)
        else:
            portion = 0
        if portion <= 0 or prot100 < 8 or kcal100 > 350:
            continue
        suggestions.append({
            "food": food,
            "kcal": round(kcal100,1),
            "protein": round(prot100,1),
            "portion_g": round(portion,1),
            "kcal_gain": round(portion * kcal100 / 100,1),
            "protein_gain": round(portion * prot100 / 100,1),
            "protein_per_100kcal": round(prot100 / kcal100 * 100,1),
            "note": None
        })
    suggestions.sort(key=lambda x: (-x["portion_g"], -x["protein_gain"]))
    suggestions = suggestions[:8]
    return {
        "tdee": int(tdee),
        "kcal_used": round(kcal_used,1),
        "protein_used": round(protein_used,1),
        "remaining_kcal": round(remaining_kcal,1),
        "remaining_protein": round(remaining_protein,1),
        "suggestions": suggestions
    }

# ── Serve SPA ──
from fastapi.responses import FileResponse, JSONResponse
import os, mimetypes
STATIC = os.environ.get("STATIC_DIR", os.path.join(os.path.dirname(__file__), "static"))

@app.get("/static/{file_path:path}")
async def serve_static(file_path: str):
    """Serve static files (JS, CSS, images). Try multiple paths."""
    for prefix in [STATIC, os.path.join(STATIC, "static")]:
        full = os.path.join(prefix, file_path)
        if os.path.isfile(full):
            mt, _ = mimetypes.guess_type(full)
            return FileResponse(full, media_type=mt or "application/octet-stream")
    return JSONResponse({"detail": "Not Found"}, status_code=404)

@app.exception_handler(404)
async def serve_spa(request, exc):
    """Render index.html for any non-API, non-static path (SPA routing)."""
    for prefix in [STATIC, os.path.join(STATIC, "static")]:
        index = os.path.join(prefix, "index.html")
        if os.path.isfile(index):
            return FileResponse(index, media_type="text/html")
    return JSONResponse({"detail": "Not Found"}, status_code=404)
