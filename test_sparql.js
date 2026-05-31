import { QueryEngine } from '@comunica/query-sparql-file';

const engine = new QueryEngine();

async function runQuery(query) {
  const result = await engine.query(query, {
    sources: ['daten.nt'], // lokale N-Triples-Datei
  });

  if (result.resultType === 'bindings') {
    const stream = await result.execute();

    for await (const binding of stream) {
      console.log(binding.toString());
    }
  }

  if (result.resultType === 'quads') {
    const stream = await result.execute();

    for await (const quad of stream) {
      console.log(
        quad.subject.value,
        quad.predicate.value,
        quad.object.value
      );
    }
  }

  if (result.resultType === 'boolean') {
    console.log(await result.execute());
  }
}

runQuery(`
  SELECT ?s ?p ?o
  WHERE {
    ?s ?p ?o .
  }
  LIMIT 20
`).catch(console.error);