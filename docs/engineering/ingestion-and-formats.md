# Ingestion and formats

The ingestion layer's job: accept any supported file, detect its real
format, parse it, and emit one of three normalized internal shapes so every
later stage (detection, policy, operators, output) works against a single
representation regardless of what came in.

## Format detection, in priority order

1. **Magic bytes** — the file's actual header, checked first.
2. **File extension** — used as a fallback when magic bytes are inconclusive.
3. **Content sniffing** — for the remaining ambiguous cases, an actual
   attempt to parse as CSV or JSON.

## Supported formats

| Format | Parser | Internal shape |
| --- | --- | --- |
| CSV | pandas `read_csv` | `DataFrameDoc` |
| TSV | pandas `read_csv` (tab delimiter) | `DataFrameDoc` |
| Excel (`.xlsx`) | openpyxl / pandas | `DataFrameDoc` |
| JSON | `json.loads` (flat or nested) | `DocTree` |
| JSONL | line-by-line `json.loads` | `DocTree` |
| XML | `defusedxml` (XML-bomb-safe `ElementTree`) | `DocTree` |
| Plain text | raw string | `TextDoc` |
| SQL dump | regex `INSERT ... VALUES` extraction | `DataFrameDoc` |
| Parquet | pyarrow / pandas | `DataFrameDoc` |
| PDF (text-only) | pdfplumber | `TextDoc` |

**A known, honest limitation:** the `.xls` extension (legacy binary Excel,
pre-OOXML) is recognized and routed to the Excel parser, but the parser
only has an OOXML engine (`openpyxl`) installed — no `xlrd` or equivalent
legacy decoder. A genuine `.xls` file will be *detected* correctly and then
*fail to parse*. Treat `.xls` support today as extension-recognition only,
not actual legacy-format decoding.

## The three internal representations

```python
@dataclass
class TextDoc:
    content: str
    metadata: dict  # filename, format, encoding

@dataclass
class DataFrameDoc:
    df: pd.DataFrame
    metadata: dict

@dataclass
class DocTree:
    root: dict | list
    metadata: dict

InternalDoc = TextDoc | DataFrameDoc | DocTree
```

Everything downstream — detection, operators, output serialization —
pattern-matches on which of these three it received, rather than caring
about the original file format at all. A new file format only ever needs a
new parser that emits one of these three shapes; nothing else in the
pipeline changes.

## Supporting utilities in this layer

Three modules operate on an already-parsed `InternalDoc` rather than
producing one, but live in the ingestion layer because they're format-shape
utilities, not pipeline stages of their own:

- **`flatten`** — turns any `InternalDoc` into a flat list of
  `(field_path, value)` pairs. This is what the detection engine iterates
  over for `TextDoc`/`DocTree`, and what field-name heuristics use to get a
  leaf path like `$.customers[0].email`.
- **`preview`** — builds the before/after preview payload shown in the UI.
- **`reconstruct`** — `set_value_at_path`/`delete_at_path`, used by the
  operator engine and the re-identification engine to mutate a document at
  a specific path without needing to know the document's overall shape.

## Extending it

The parser layer is pluggable by design: implement
`BaseParser.parse(bytes) -> InternalDoc` and register it in the
`ParserRegistry`. Nothing else needs to change — detection, policy
resolution, and the operator engine all already work against the three
shapes above, not against file formats directly.
