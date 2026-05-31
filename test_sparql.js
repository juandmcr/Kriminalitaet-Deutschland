import { QueryEngine } from "@comunica/query-sparql-file";

const engine = new QueryEngine();

async function runQuery(query) {
  const result = await engine.query(query, {
    sources: ["daten_indikatoren.nt"], // lokale N-Triples-Datei
  });

  if (result.resultType === "bindings") {
    const stream = await result.execute();

    for await (const binding of stream) {
      console.log(binding.toString());
    }
  }

  if (result.resultType === "quads") {
    const stream = await result.execute();

    for await (const quad of stream) {
      console.log(quad.subject.value, quad.predicate.value, quad.object.value);
    }
  }

  if (result.resultType === "boolean") {
    console.log(await result.execute());
  }
}

runQuery(`
  PREFIX ind: <https://gitlab.dit.htwk-leipzig.de/results-sw/2026/stadt_kriminalitaet/indikator/>
  PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

  SELECT ?kreisname ?straft WHERE {
    ?kreis ind:straft ?straft .
    ?kreis rdfs:label ?kreisname .
  }
  ORDER BY DESC(?straft)
`).catch(console.error);
