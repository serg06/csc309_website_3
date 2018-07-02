--- load with 
--- sqlite3 database.db < schema.sql

DROP TABLE IF EXISTS appuser;

-- users of the app
CREATE TABLE appuser (
  id       VARCHAR(20) PRIMARY KEY,
  password CHAR(32)    NOT NULL, -- md5
  name     VARCHAR(20) NOT NULL,
  score    INT         NOT NULL DEFAULT 0
);

-- test user (password = md5('apassword'))
INSERT INTO appuser (id, password, name) VALUES ('auser', '04f0cef3e4796f6967fd5bae6e2c9113', 'tester');

