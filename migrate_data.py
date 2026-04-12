import psycopg2

# LOCAL DATABASE
local_conn = psycopg2.connect(
    host="localhost",
    database="postgres",  # change if needed
    user="postgres",
    password="blueocean8"
)

# RENDER DATABASE
render_conn = psycopg2.connect(
    host="dpg-d7b0c5ogjchc73a31sd0-a.singapore-postgres.render.com",
    database="dycibo_db",
    user="dycibo_db_user",
    password="OInqhbqO3ugKIvOBW2TuGPOzBm6MdVMI",
    port=5432
)

local_cur = local_conn.cursor()
render_cur = render_conn.cursor()

# COPY ARTIFACTS
local_cur.execute("SELECT * FROM artifacts")
rows = local_cur.fetchall()

for row in rows:
    render_cur.execute("""
        INSERT INTO artifacts VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT DO NOTHING
    """, row)

print("Artifacts migrated")

# COPY DETECTIONS
local_cur.execute("SELECT * FROM detections")
rows = local_cur.fetchall()

for row in rows:
    render_cur.execute("""
        INSERT INTO detections VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT DO NOTHING
    """, row)

print("Detections migrated")

render_conn.commit()

local_cur.close()
render_cur.close()
local_conn.close()
render_conn.close()

print("DONE")