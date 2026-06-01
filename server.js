import express from "express";
import { QueryEngine } from "@comunica/query-sparql-file";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const engine = new QueryEngine();

app.use(express.static(__dirname));
app.use(express.json());

app.get("/api/top-cities", async (req, res) => {
  try {
    const indicator = req.query.indicator || "straft";

    const result = await engine.query(
      `
      PREFIX ind: <https://gitlab.dit.htwk-leipzig.de/results-sw/2026/stadt_kriminalitaet/indikator/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

      SELECT ?kreisname ?value WHERE {
        ?kreis ind:${indicator} ?value .
        ?kreis rdfs:label ?kreisname .
      }
      ORDER BY ASC(?value)
    `,
      { sources: ["daten_indikatoren.nt"] },
    );

    const data = [];

    if (result.resultType === "bindings") {
      const stream = await result.execute();

      for await (const binding of stream) {
        const keys = Array.from(binding.keys());
        const kreisname = binding.get(
          keys.find((k) => k.value === "kreisname"),
        );
        const value = binding.get(keys.find((k) => k.value === "value"));

        if (!kreisname || !value) {
          continue;
        }

        const kreisnameStr = kreisname.value || "";
        const valueStr = value.value || "0";

        const kreisMatch = kreisnameStr.match(/^"([^"]+)"/);
        const city = kreisMatch ? kreisMatch[1] : kreisnameStr;

        const valueNum = parseFloat(valueStr);

        if (isNaN(valueNum)) {
          continue;
        }

        data.push({
          city,
          count: valueNum,
        });
      }
    }

    res.json(data);
  } catch (error) {
    console.error("Query error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
