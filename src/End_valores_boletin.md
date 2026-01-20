## Endpoint

`GET /api/valores/boletin`

### Query params (opcionales)

`nro_obrasocial` (int): filtra por obra social.

`nivel` (int): filtra por nivel.

`fecha_cambio` (YYYY-MM-DD): filtra por fecha exacta.

`categoria` (A|B|C): filtra filas cuya categoría A/B/C sea la indicada.

> **Todos los filtros son combinables.**

### Ejemplos

1. Valores de una obra social puntual

` GET /api/valores/boletin?nro_obrasocial=243`

2. Obra social + nivel

` GET /api/valores/boletin?nro_obrasocial=243&nivel=7`

3. Solo fecha exacta

` GET /api/valores/boletin?fecha_cambio=2025-10-01`

4. Filtrar por categoría “A”

` GET /api/valores/boletin?categoria=A`

5. Combinado

` GET /api/valores/boletin?nro_obrasocial=243&nivel=7&categoria=C&fecha_cambio=2025-10-01`

### Respuesta json

```
[
  {
    "id": 1234,
    "nro_obrasocial": 243,
    "obra_social": "IOSCOR",
    "nivel": 7,
    "fecha_cambio": "2025-10-01",

    "consulta": 4500.0,
    "galeno_quirurgico": 0.0,
    "gastos_quirurgicos": 0.0,
    "galeno_practica": 0.0,
    "galeno_radiologico": 0.0,
    "gastos_radiologico": 0.0,
    "gastos_bioquimicos": 0.0,
    "otros_gastos": 0.0,
    "galeno_cirugia_adultos": 0.0,
    "galeno_cirugia_infantil": 0.0,
    "consulta_especial": 0.0,

    "categoria_a": "A",
    "categoria_b": "A",
    "categoria_c": "B"
  }
]
```

## Notas para UI

- **Los montos vienen como numbers (no strings)**

- **El campo obra_social puede venir null si no hay match en la tabla ObrasSociales**
