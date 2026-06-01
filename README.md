# Kriminalitäts- & Indikatorenatlas

Für 400 deutsche Kreise werden die Straftatenrate pro 100.000 Einwohner und verschiedene sozioökonomische Indikatoren (Arbeitslosenquote, Jugendanteil, Sportvereinsdichte usw.) in einem Scatterplot dargestellt.  
Die Daten werden clientseitig aus einer NT‑Datei per SPARQL (Comunica) abgefragt. Eine Regressionslinie (wahlweise linear, exponentiell, LOESS etc.) zeigt den Trend.

![Screenshot](.screenshot.png)

## Datenquelle

Die Rohdaten stammen vom [Deutschlandatlas](https://www.deutschlandatlas.bund.de/SharedDocs/Downloads/DE/Deutschlandatlas-Daten.html) (Tabellen KRS1222, KRS1224).  
Aus den Excel‑Tabellen haben wir eine N‑Triples‑Datei (`daten_indikatoren.nt`) erstellt, die alle Kreise und Indikatoren im RDF‑Format enthält.

## Lokaler Test

Im Projektordner:

```bash
python3 -m http.server 8000  
```  
Dann einfach http://localhost:8000 öffnen.  

## Eigene Daten verwenden  

1. daten_indikatoren.nt durch eigene Datei ersetzen.  
2. In main.js die SPARQL‑Queries an das eigene RDF‑Modell anpassen (Präfixe ind:, Property rdfs:label werden aktuell erwartet).  
3. Neue Indikatoren in index.html als Checkbox mit passendem value eintragen.  
  
Die restliche Logik (Comunica, N3‑Parser, D3‑Plots) sollte unverändert bleiben können.
