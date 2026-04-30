import json
import os
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timezone

client = MongoClient("mongodb://localhost:27017")
db     = client.MovieHub_data

os.makedirs("data", exist_ok=True)

def serialize(doc):
    """Convert MongoDB types to JSON-serializable equivalents."""
    result = {}
    for key, value in doc.items():
        if key == "_id":
            continue  # skip MongoDB internal _id — seed will generate new ones
        elif isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, dict):
            result[key] = serialize(value)
        elif isinstance(value, list):
            result[key] = [serialize(i) if isinstance(i, dict) else i for i in value]
        else:
            result[key] = value
    return result

def export_collection(collection, filename):
    docs = [serialize(doc) for doc in collection.find()]
    path = os.path.join("data", filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(docs, f, indent=2, ensure_ascii=False)
    print(f"  {filename}: exported {len(docs)} documents")

print("\nMovieHub — Exporting live database")
print("=" * 40)
export_collection(db.movies,    "movies.json")
export_collection(db.users,     "users.json")
export_collection(db.reviews,   "reviews.json")
export_collection(db.watchlist, "watchlist.json")
print("=" * 40)
print("Done — files saved to m-backend/data/")
