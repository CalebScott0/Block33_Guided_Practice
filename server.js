const pg = require("pg");
const express = require("express");

const client = new pg.Client(
  process.env.DATABASE_URL || "postgres://localhost/acme_notes_categories_db"
);
// create express server
const server = express();

const init = async () => {
  await client.connect();
  console.log("client connected");
  //   drop child table first!
  let SQL = `
    DROP TABLE IF EXISTS notes;
    DROP TABLE IF EXISTS categories;
    CREATE TABLE categories(
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL
    );
    CREATE TABLE notes(
        id SERIAL PRIMARY KEY,
        txt VARCHAR(255) NOT NULL,
        ranking INTEGER DEFAULT 4 NOT NULL,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now(),
        category_id INTEGER REFERENCES categories(id)
        NOT NULL
    );
  `;
  await client.query(SQL);
  console.log("tables created");
  SQL = `
    INSERT INTO categories(name) VALUES('SQL');
    INSERT INTO categories(name) VALUES('Express');
    INSERT INTO categories(name) VALUES('Morgan');

    INSERT INTO notes(txt, ranking, category_id) VALUES ('create tables', 1, (SELECT id FROM
    categories WHERE name = 'SQL'));
    INSERT INTO notes(txt, ranking, category_id) VALUES ('create endpoints', 3, (SELECT id FROM
    categories WHERE name = 'Express'));
    INSERT INTO notes(txt, ranking, category_id) VALUES ('log routes', 2, (SELECT id FROM
    categories WHERE name = 'Morgan'));
  `;
  await client.query(SQL);
  console.log("seeded data");

  //   server listen on a port
  const PORT = process.env.port || 3000;
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
};
init();

server.use(express.json());
server.use(require("morgan")("dev"));

server.get("/api/categories", async (req, res, next) => {
  try {
    const SQL = `SELECT * FROM categories;`;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (error) {
    next(error);
  }
});

server.get("/api/notes", async (req, res, next) => {
  try {
    const SQL = `SELECT * FROM notes`;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (error) {
    next(error);
  }
});

server.post("/api/notes", async (req, res, next) => {
  try {
    const { txt, ranking, category_id } = req.body;
    const SQL = `INSERT INTO notes(txt,ranking,category_id) VALUES($1, $2, $3) RETURNING *`;
    const response = await client.query(SQL, [txt, ranking, category_id]);
    res.status(201).send(response.rows[0]);
  } catch (error) {
    next(error);
  }
});

server.put("/api/notes/:id", async (req, res, next) => {
  try {
    const { txt, ranking, category_id } = req.body;
    const SQL = `UPDATE notes SET txt=$1, ranking=$2, category_id=$3, updated_at=now()
    WHERE id=$4 RETURNING *;`;
    const response = await client.query(SQL, [
      txt,
      ranking,
      category_id,
      req.params.id,
    ]);
    res.send(response.rows[0]);
  } catch (error) {
    next(error);
  }
});

server.delete("/api/notes/:id", async (req, res, next) => {
  try {
    const SQL = `DELETE FROM notes where ID=$1`;
    await client.query(SQL, [req.params.id]);
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

// error handling route returns object with error property
server.use((err, req, res) => {
  res.status(res.status || 500).send({ error: err });
});
