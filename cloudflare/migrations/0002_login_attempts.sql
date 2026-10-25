-- Neúspěšná přihlášení do /admin, kvůli omezení počtu pokusů (hádání hesla).
CREATE TABLE login_attempts (
  id INTEGER PRIMARY KEY,
  ip TEXT NOT NULL,
  at INTEGER NOT NULL               -- unix čas v sekundách
);
CREATE INDEX login_attempts_at ON login_attempts(at);
