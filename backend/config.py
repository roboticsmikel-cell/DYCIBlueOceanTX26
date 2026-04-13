# SQLALCHEMY_DATABASE_URI = ("postgresql+psycopg2://postgres:blueocean8@localhost:5432/postgres")
# SQLALCHEMY_TRACK_MODIFICATIONS = False

import os

SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
if not SQLALCHEMY_DATABASE_URI:
    raise ValueError("DATABASE_URL is not set")

SQLALCHEMY_TRACK_MODIFICATIONS = False

SQLALCHEMY_ENGINE_OPTIONS = {
    "pool_pre_ping": True,
    "pool_recycle": 300,
}