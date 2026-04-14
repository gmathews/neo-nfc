
# Trouble Shooting
to delete a user:
```bash
sqlite3 neo-nfc.db "DELETE FROM feedback WHERE uid = '8bf55407'; DELETE FROM card_data WHERE uid = '8bf55407';"
```
to clear today's feedback:
```bash
sqlite3 neo-nfc.db "
    DELETE FROM feedback
    WHERE uid = '8bf55407'
      AND created_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', 'localtime', 'start of day', 'utc');
    DELETE FROM card_data
    WHERE uid = '8bf55407'
      AND created_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', 'localtime', 'start of day', 'utc');
  "
```
