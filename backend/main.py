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
        print(f"BQ error: {e}", flush=True)
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
    data = {r["d"]: int(r["kcal"]) for r in rows}
    return {"labels": days, "values": [data.get(d,0) for d in days]}

@app.get("/protein-7d")
def protein_7d():
    days = _week(); dl = ",".join(f"'{d}'" for d in days)
    rows = _q(f"SELECT DATE(ts) d, COALESCE(SUM(protein_g),0) protein FROM `{PROJECT}.{DATASET}.food_entries` WHERE DATE(ts) IN ({dl}) GROUP BY d ORDER BY d")
    data = {r["d"]: round(r["protein"],1) for r in rows}
    return {"labels": days, "values": [data.get(d,0) for d in days]}

@app.get("/weight-bf-7d")
def weight_bf_7d():
    days = _week(); dl = ",".join(f"'{d}'" for d in days)
    rows = _q(f"SELECT DATE(ts) d, weight_kg, body_fat_pct FROM `{PROJECT}.{DATASET}.daily_measure` WHERE DATE(ts) IN ({dl}) ORDER BY d")
    data = {r["d"]: (r["weight_kg"], r["body_fat_pct"]) for r in rows}
    return {"labels": days,
            "weight": [data.get(d,(None,None))[0] for d in days],
            "body_fat": [data.get(d,(None,None))[1] for d in days]}

@app.get("/debug-files")
async def debug_files():
    """List static dir contents (debug)."""
    import os
    result = {"static_dir": STATIC, "exists": os.path.isdir(STATIC)}
    if os.path.isdir(STATIC):
        files = []
        for root, dirs, fnames in os.walk(STATIC):
            for f in fnames:
                files.append(os.path.relpath(os.path.join(root, f), STATIC))
        result["files"] = sorted(files)
    return result

@app.get("/macros-today")
def macros_today():
    t = _today()
    rows = _q(f"SELECT COALESCE(SUM(protein_g),0) p, COALESCE(SUM(carbs_g),0) c, COALESCE(SUM(fat_g),0) f FROM `{PROJECT}.{DATASET}.food_entries` WHERE DATE(ts)='{t}'")
    r = rows[0] if rows else {}
    return {"labels": ["Protein","Carbs","Fat"], "values": [round(r.get("p",0),1), round(r.get("c",0),1), round(r.get("f",0),1)]}

# ── Serve SPA ──
from fastapi.responses import FileResponse, JSONResponse
import os, mimetypes
STATIC = os.environ.get("STATIC_DIR", os.path.join(os.path.dirname(__file__), "static"))

@app.get("/static/{file_path:path}")
async def serve_static(file_path: str):
    """Serve static files (JS, CSS, images)."""
    full = os.path.join(STATIC, file_path)
    if os.path.isfile(full):
        mt, _ = mimetypes.guess_type(full)
        return FileResponse(full, media_type=mt or "application/octet-stream")
    return JSONResponse({"detail": "Not Found"}, status_code=404)

@app.exception_handler(404)
async def serve_spa(request, exc):
    """Render index.html for any non-API, non-static path (SPA routing)."""
    index = os.path.join(STATIC, "index.html")
    if os.path.isfile(index):
        return FileResponse(index, media_type="text/html")
    return JSONResponse({"detail": "Not Found"}, status_code=404)
