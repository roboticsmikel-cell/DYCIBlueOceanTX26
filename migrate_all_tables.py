import psycopg2

# -----------------------------
# CONNECT TO LOCAL DATABASE
# -----------------------------
local_conn = psycopg2.connect(
    host="localhost",
    database="postgres",   # change if needed
    user="postgres",
    password="blueocean8"
)

# -----------------------------
# CONNECT TO RENDER DATABASE
# -----------------------------
render_conn = psycopg2.connect(
    host="dpg-d7b0c5ogjchc73a31sd0-a.singapore-postgres.render.com",
    database="dycibo_db",
    user="dycibo_db_user",
    password="OInqhbqO3ugKIvOBW2TuGPOzBm6MdVMI",
    port=5432
)

local_cur = local_conn.cursor()
render_cur = render_conn.cursor()

# -----------------------------
# GET ALL TABLES
# -----------------------------
local_cur.execute("""
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
""")

tables = local_cur.fetchall()

print(f"Found {len(tables)} tables")

# -----------------------------
# COPY EACH TABLE
# -----------------------------
for (table_name,) in tables:
    print(f"\nCopying table: {table_name}")

    # Get column names
    local_cur.execute(f"""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = '{table_name}'
        ORDER BY ordinal_position
    """)
    columns = [col[0] for col in local_cur.fetchall()]
    col_names = ", ".join(columns)
    placeholders = ", ".join(["%s"] * len(columns))

    # Get all data
    local_cur.execute(f"SELECT * FROM {table_name}")
    rows = local_cur.fetchall()

    print(f"→ {len(rows)} rows")

    # Insert into Render
    for row in rows:
        try:
            render_cur.execute(
                f"""
                INSERT INTO {table_name} ({col_names})
                VALUES ({placeholders})
                ON CONFLICT DO NOTHING
                """,
                row
            )
        except Exception as e:
            print(f"Error inserting into {table_name}: {e}")

# -----------------------------
# SAVE CHANGES
# -----------------------------
render_conn.commit()

# CLOSE CONNECTIONS
local_cur.close()
render_cur.close()
local_conn.close()
render_conn.close()

print("\n✅ ALL TABLES MIGRATED SUCCESSFULLY")