# Boletín Galenos — Backend

## Tables

### `boletin_galenos`
Stores one record per OS + level + vigencia combination.

```sql
CREATE TABLE boletin_galenos (
  id                      SERIAL PRIMARY KEY,
  nro_obra_social         INTEGER      NOT NULL REFERENCES obras_social(NRO_OBRA_SOCIAL),
  fecha_vigencia          DATE         NOT NULL,
  nivel                   SMALLINT     NOT NULL CHECK (nivel IN (0, 7, 10)),

  -- Galenos
  galeno_quirurgico       NUMERIC(12,2) DEFAULT 0,
  galeno_practica         NUMERIC(12,2) DEFAULT 0,
  galeno_radiologico      NUMERIC(12,2) DEFAULT 0,
  galeno_cirugia_adultos  NUMERIC(12,2) DEFAULT 0,
  galeno_cirugia_infantil NUMERIC(12,2) DEFAULT 0,
  galeno_ginecologia      NUMERIC(12,2) DEFAULT 0,
  galeno_urologia         NUMERIC(12,2) DEFAULT 0,

  -- Gastos
  gastos_quirurgicos      NUMERIC(12,2) DEFAULT 0,
  gastos_radiologico      NUMERIC(12,2) DEFAULT 0,
  gastos_bioquimicos      NUMERIC(12,2) DEFAULT 0,
  otros_gastos            NUMERIC(12,2) DEFAULT 0,

  created_at              TIMESTAMPTZ  DEFAULT now(),
  updated_at              TIMESTAMPTZ  DEFAULT now(),

  UNIQUE (nro_obra_social, fecha_vigencia, nivel)
);
```

### `boletin_galenos_codigos`
Links each boletín record to the codes it affected, storing before/after values.

```sql
CREATE TABLE boletin_galenos_codigos (
  id               SERIAL PRIMARY KEY,
  boletin_id       INTEGER       NOT NULL REFERENCES boletin_galenos(id) ON DELETE CASCADE,
  codigo           VARCHAR(20)   NOT NULL,
  descripcion      VARCHAR(255),
  campo            VARCHAR(60)   NOT NULL,  -- e.g. 'galeno_quirurgico'
  valor_anterior   NUMERIC(12,2) NOT NULL,
  valor_nuevo      NUMERIC(12,2) NOT NULL,
  created_at       TIMESTAMPTZ   DEFAULT now()
);

CREATE INDEX idx_bgc_boletin ON boletin_galenos_codigos(boletin_id);
```

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/boletin-galenos/` | List all records (paginated: `?page=1&limit=20`) |
| `POST` | `/api/boletin-galenos/` | Create new boletín |
| `GET`  | `/api/boletin-galenos/:id` | Get single record |
| `PUT`  | `/api/boletin-galenos/:id` | Update record |
| `DELETE` | `/api/boletin-galenos/:id` | Delete record |
| `GET`  | `/api/boletin-galenos/:id/codigos` | Paginated codes affected (`?page=1&limit=8`) |

### POST `/api/boletin-galenos/` — body
```json
{
  "nro_obra_social": 123,
  "fecha_vigencia": "2026-06-01",
  "nivel": 0,
  "galeno_quirurgico": 9200,
  "galeno_practica": 1350,
  "galeno_radiologico": 2350,
  "galeno_cirugia_adultos": 24500,
  "galeno_cirugia_infantil": 10000,
  "galeno_ginecologia": 13500,
  "galeno_urologia": 8000,
  "gastos_quirurgicos": 3900,
  "gastos_radiologico": 2000,
  "gastos_bioquimicos": 1100,
  "otros_gastos": 1230
}
```

### GET `/api/boletin-galenos/:id/codigos` — response
```json
{
  "total": 25,
  "page": 1,
  "limit": 8,
  "results": [
    {
      "id": 1,
      "codigo": "0501001",
      "descripcion": "Consulta ambulatoria",
      "campo": "galeno_practica",
      "valor_anterior": 1200.00,
      "valor_nuevo": 1350.00
    }
  ]
}
```
