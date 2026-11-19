#!/usr/bin/env bash
# MySQL transaction evidence against the disposable audit database only.
# Writes docs/evidence/mysql/*.sql|txt and docs/evidence/screenshots/mysql/*.png.
# Usage: bash docs/build/evidence-mysql.sh
set -uo pipefail
cd "$(dirname "$0")/../.."
DB=atelier-audit-db
API=${API:-http://127.0.0.1:18081}
OUT=docs/evidence/mysql
SHOTS=docs/evidence/screenshots/mysql
mkdir -p "$OUT" "$SHOTS"
# the password is read from the container environment and handed over as MYSQL_PWD only
PW=$(docker inspect "$DB" --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^MYSQL_ROOT_PASSWORD=//p')
MANIFEST=$(mktemp)

mysql_run() { docker exec -i -e MYSQL_PWD="$PW" "$DB" mysql -uroot atelier -t --default-character-set=utf8mb4 "$@" 2>&1 | grep -a -v "Using a password"; }

# shot FILE-BASE TITLE CAPTION [cmd]: screenshot $OUT/FILE-BASE.txt and add a manifest row
shot() {
  local base=$1 title=$2 caption=$3 cmd=${4:-"mysql -t -vvv atelier < $base.sql"}
  node docs/build/terminal-shot.mjs --out "$SHOTS/$base.png" --width 1200 --pane "$OUT/$base.txt|$title|$cmd"
  printf '%s\t%s\t%s\n' "$base.png" "$title" "$caption" >> "$MANIFEST"
}

# scenario BASE TITLE CAPTION MYSQL_FLAGS: SQL on stdin is saved, executed and screenshotted
scenario() {
  local base=$1 title=$2 caption=$3; shift 3
  cat > "$OUT/$base.sql"
  mysql_run "$@" < "$OUT/$base.sql" > "$OUT/$base.txt"
  shot "$base" "$title" "$caption" "mysql -t $* atelier < $base.sql"
}

scenario 01-tables-foreign-keys "MySQL — tables and the 13 foreign keys with delete rules" \
  "SHOW TABLES lists the nine tables and information_schema lists the 13 foreign keys with their delete rules." -v --force <<'SQL'
SHOW TABLES;
SELECT k.TABLE_NAME AS table_name, k.COLUMN_NAME AS column_name, k.REFERENCED_TABLE_NAME AS referenced_table, r.DELETE_RULE AS delete_rule
FROM information_schema.REFERENTIAL_CONSTRAINTS r
JOIN information_schema.KEY_COLUMN_USAGE k
  ON k.CONSTRAINT_SCHEMA = r.CONSTRAINT_SCHEMA AND k.CONSTRAINT_NAME = r.CONSTRAINT_NAME AND k.TABLE_NAME = r.TABLE_NAME
WHERE r.CONSTRAINT_SCHEMA = 'atelier'
ORDER BY k.TABLE_NAME, k.COLUMN_NAME;
SQL

scenario 02-describe-indexes "MySQL — DESCRIBE users, DESCRIBE auctions, indexes of bids" \
  "DESCRIBE shows the column types of users and auctions and information_schema.STATISTICS lists the bids indexes including the unique (auction_id, amount)." -v --force <<'SQL'
DESCRIBE users;
DESCRIBE auctions;
SELECT INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'atelier' AND TABLE_NAME = 'bids' ORDER BY INDEX_NAME, SEQ_IN_INDEX;
SQL

scenario 03-commit-rollback "MySQL — START TRANSACTION, INSERT, ROLLBACK" \
  "An artist inserted inside a transaction is visible to the session, then ROLLBACK removes it and the second SELECT returns no row." -v --force <<'SQL'
START TRANSACTION;
INSERT INTO artists (name, email) VALUES ('Evidence Rollback Artist', 'rollback.evidence@example.test');
SELECT id, name, email FROM artists WHERE email = 'rollback.evidence@example.test';
ROLLBACK;
SELECT id, name, email FROM artists WHERE email = 'rollback.evidence@example.test';
SQL

# 04: two concurrent sessions on the same auction row
cat > "$OUT/04-lock-session1.sql" <<'SQL'
START TRANSACTION;
SELECT NOW(3) AS s1_before_lock;
SELECT id, current_price, version FROM auctions WHERE id = 5 FOR UPDATE;
SELECT NOW(3) AS s1_lock_acquired;
SELECT SLEEP(5);
ROLLBACK;
SELECT NOW(3) AS s1_released;
SQL
cat > "$OUT/04-lock-session2.sql" <<'SQL'
SET SESSION innodb_lock_wait_timeout = 10;
START TRANSACTION;
SELECT NOW(3) AS s2_before_lock;
SELECT id, current_price, version FROM auctions WHERE id = 5 FOR UPDATE;
SELECT NOW(3) AS s2_lock_acquired;
ROLLBACK;
SQL
mysql_run -vvv --force < "$OUT/04-lock-session1.sql" > "$OUT/04-lock-session1.txt" &
S1=$!
sleep 1
mysql_run -vvv --force < "$OUT/04-lock-session2.sql" > "$OUT/04-lock-session2.txt"
wait $S1
node docs/build/terminal-shot.mjs --out "$SHOTS/04-pessimistic-lock.png" --width 1800 \
  --pane "$OUT/04-lock-session1.txt|Session 1 — holds the row lock|mysql -t -vvv atelier < 04-lock-session1.sql" \
  --pane "$OUT/04-lock-session2.txt|Session 2 — started 1 s later, waits|mysql -t -vvv atelier < 04-lock-session2.sql"
printf '%s\t%s\t%s\n' 04-pessimistic-lock.png "MySQL — two sessions, SELECT … FOR UPDATE" \
  "Session 2 asked for the same auction row 1 second after session 1 and its SELECT … FOR UPDATE returned only after session 1 rolled back, as the timestamps show." >> "$MANIFEST"

scenario 05-optimistic-lock "MySQL — optimistic lock with the version column" \
  "The first UPDATE ... WHERE version = old matches 1 row and bumps the version, the repeat with the stale version matches 0 rows; the transaction is rolled back." -vvv --force <<'SQL'
START TRANSACTION;
SELECT @v := version AS version_read FROM artists WHERE id = 1;
UPDATE artists SET name = name, version = version + 1 WHERE id = 1 AND version = @v;
UPDATE artists SET name = name, version = version + 1 WHERE id = 1 AND version = @v;
SELECT id, version FROM artists WHERE id = 1;
ROLLBACK;
SELECT id, version FROM artists WHERE id = 1;
SQL

scenario 06a-fk-restrict "MySQL — foreign key without ON DELETE, ERROR 1451" \
  "Deleting an artist that still has an exhibition and artworks is refused with ERROR 1451 (the fk_artworks_artist constraint, delete rule NO ACTION) and the transaction is rolled back." -vvv --force <<'SQL'
START TRANSACTION;
SELECT id, title, artist_id FROM exhibitions WHERE artist_id = 1;
DELETE FROM artists WHERE id = 1;
ROLLBACK;
SELECT id, name FROM artists WHERE id = 1;
SQL

scenario 06b-fk-set-null "MySQL — ON DELETE SET NULL on artworks.exhibition_id" \
  "Deleting exhibition 2 inside a transaction sets exhibition_id to NULL on its artworks; ROLLBACK restores the links." -v --force <<'SQL'
START TRANSACTION;
SELECT id, title, exhibition_id FROM artworks WHERE artist_id = 2 ORDER BY id;
DELETE FROM exhibitions WHERE id = 2;
SELECT id, title, exhibition_id FROM artworks WHERE artist_id = 2 ORDER BY id;
ROLLBACK;
SELECT id, title, exhibition_id FROM artworks WHERE artist_id = 2 ORDER BY id;
SQL

scenario 06c-fk-cascade "MySQL — ON DELETE CASCADE on user_roles.user_id" \
  "Deleting a temporary user removes its user_roles row automatically; ROLLBACK leaves no trace of the temporary user." -v --force <<'SQL'
START TRANSACTION;
INSERT INTO users (first_name, last_name, email, password) VALUES ('Temp', 'Cascade', 'cascade.evidence@example.test', 'not-a-real-hash');
SET @u = LAST_INSERT_ID();
INSERT INTO user_roles (user_id, role_id) VALUES (@u, 3);
SELECT * FROM user_roles WHERE user_id = @u;
DELETE FROM users WHERE id = @u;
SELECT COUNT(*) AS user_roles_left FROM user_roles WHERE user_id = @u;
ROLLBACK;
SELECT COUNT(*) AS temp_users_left FROM users WHERE email = 'cascade.evidence@example.test';
SQL

scenario 07-unique-check "MySQL — UNIQUE (auction_id, amount) and CHECK constraint" \
  "A duplicate bid amount fails with ERROR 1062 and a negative exhibition budget fails with ERROR 3819; both transactions are rolled back." -vvv --force <<'SQL'
START TRANSACTION;
SELECT auction_id, bidder_id, amount FROM bids WHERE auction_id = 1 ORDER BY amount LIMIT 1;
INSERT INTO bids (auction_id, bidder_id, amount, created_at)
SELECT auction_id, bidder_id, amount, NOW(6) FROM bids WHERE auction_id = 1 ORDER BY amount LIMIT 1;
ROLLBACK;
START TRANSACTION;
INSERT INTO exhibitions (title, budget, duration_days, artist_id) VALUES ('Negative budget', -1, 10, 1);
ROLLBACK;
SELECT COUNT(*) AS rows_left FROM exhibitions WHERE title = 'Negative budget';
SQL

# 08: SQL issued by Hibernate for one real bid, from the general query log
LOGF=/tmp/atelier-general.log
OLDLOG=$(docker exec -e MYSQL_PWD="$PW" "$DB" mysql -uroot -N -B -e "SELECT @@general_log_file" 2>/dev/null)
mysql_run -e "SET GLOBAL general_log_file='$LOGF'; SET GLOBAL general_log=ON;" >/dev/null
LOGIN=$(curl -s -X POST "$API/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"collector@atelier.demo","password":"Atelier2026!"}')
TOKEN=$(printf '%s' "$LOGIN" | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
# first OPEN auction this collector is not already leading
read -r AID AMOUNT < <(curl -s "$API/api/auctions?status=OPEN" | python3 -c '
import sys,json
d=json.load(sys.stdin).get("content")
a=[x for x in d if x["status"]=="OPEN" and x.get("leadingBidder")!="Theo C."][0]
print(a["id"], a["minimumNextBid"])')
BIDRESP=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/api/auctions/$AID/bids" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "{\"amount\": $AMOUNT}")
mysql_run -e "SET GLOBAL general_log=OFF; SET GLOBAL general_log_file='$OLDLOG';" >/dev/null
docker cp "$DB:$LOGF" "$OUT/.general.raw" && docker exec "$DB" rm -f "$LOGF"
python3 - "$OUT" "$AID" "$AMOUNT" "$BIDRESP" <<'PY'
import re, sys
out, aid, amount, code = sys.argv[1:]
lines = open(f"{out}/.general.raw", encoding="utf8", errors="replace").read().splitlines()
rec = [re.match(r"^(\S+Z)\s+(\d+) (\w+)\s*(.*)$", l) for l in lines]
tid = next(m.group(2) for m in rec if m and "insert into bids" in m.group(4).lower())
keep = [m for m in rec if m and m.group(2) == tid and m.group(3) in ("Query", "Execute")]
# the bid transaction: from the last 'set autocommit=0' before the insert to the commit
ins = next(i for i, m in enumerate(keep) if "insert into bids" in m.group(4).lower())
start = max([i for i in range(ins) if "autocommit=0" in keep[i].group(4).lower().replace(" ", "")] or [0])
end = next(i for i in range(ins, len(keep)) if keep[i].group(4).strip().lower() == "commit")
txt = [f"-- POST /api/auctions/{aid}/bids amount={amount} -> HTTP {code}; connection thread {tid}",
       "-- source: MySQL general query log"] + [f"{m.group(1)}  {m.group(4)}" for m in keep[start:end + 1]]
open(f"{out}/hibernate-bid-sql.txt", "w").write("\n".join(txt) + "\n")
PY
rm -f "$OUT/.general.raw"
shot hibernate-bid-sql "MySQL — SQL issued by Hibernate for one bid" \
  "General query log of the connection that placed a bid through the API: autocommit off, SELECT … FOR UPDATE on the auction, INSERT into bids, UPDATE auctions, COMMIT." \
  "curl -X POST /api/auctions/$AID/bids   # general_log captured on the MySQL side"

python3 - "$MANIFEST" "$SHOTS/manifest.json" <<'PY'
import json, sys
rows = [l.rstrip("\n").split("\t") for l in open(sys.argv[1])]
json.dump([dict(file=f, title=t, caption=c) for f, t, c in rows], open(sys.argv[2], "w"), ensure_ascii=False, indent=2)
open(sys.argv[2], "a").write("\n")
PY
rm -f "$MANIFEST"
