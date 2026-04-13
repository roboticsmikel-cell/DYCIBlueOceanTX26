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

# Copy in foreign-key-safe order
TABLE_ORDER = [
    "artifacts",
    "detections",
    "cam_detections",
    "ex_cam",
    "example",
    "images",
    "videos",
    "ai_artifact_analysis",
    "ai_conversations",
    "models_3d",
]

print(f"Copy order: {TABLE_ORDER}")

for table_name in TABLE_ORDER:
    print(f"\nCopying table: {table_name}")

    # Check if table exists in local DB
    local_cur.execute("""
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = %s
        )
    """, (table_name,))
    exists_local = local_cur.fetchone()[0]

    if not exists_local:
        print(f"Skipping {table_name}: not found in local DB")
        continue

    # Check if table exists in Render DB
    render_cur.execute("""
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = %s
        )
    """, (table_name,))
    exists_render = render_cur.fetchone()[0]

    if not exists_render:
        print(f"Skipping {table_name}: not found in Render DB")
        continue

    # Get common columns in correct order
    local_cur.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = %s
        ORDER BY ordinal_position
    """, (table_name,))
    local_columns = [row[0] for row in local_cur.fetchall()]

    render_cur.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = %s
        ORDER BY ordinal_position
    """, (table_name,))
    render_columns = [row[0] for row in render_cur.fetchall()]

    columns = [col for col in local_columns if col in render_columns]

    if not columns:
        print(f"Skipping {table_name}: no common columns")
        continue

    col_names = ", ".join(columns)
    placeholders = ", ".join(["%s"] * len(columns))

    # Read source rows
    local_cur.execute(
        f"SELECT {col_names} FROM {table_name}"
    )
    rows = local_cur.fetchall()

    print(f"→ {len(rows)} rows found")

    for row in rows:
        try:
            render_cur.execute(
                f"""
                INSERT INTO {table_name} ({col_names})
                OVERRIDING SYSTEM VALUE
                VALUES ({placeholders})
                ON CONFLICT DO NOTHING
                """,
                row
            )
        except Exception as e:
            print(f"\n❌ TABLE: {table_name}")
            print(f"ROW: {row}")
            print(f"ERROR: {e}\n")
            render_conn.rollback()

    try:
        render_conn.commit()
        print(f"✅ Finished table: {table_name}")
    except Exception as e:
        print(f"❌ Commit failed for {table_name}: {e}")
        render_conn.rollback()

local_cur.close()
render_cur.close()
local_conn.close()
render_conn.close()

print("\n✅ ALL TABLES MIGRATION FINISHED")