# Endpoint‑gebaseerde tracing (conceptdemo)

## Samenvatting
Deze demo laat het minimale concept zien voor endpoint‑gebaseerde tracing. Het doel is om per inkomende Express‑request alle externe calls (ruwe request/response) inzichtelijk te maken bij debugging/testing.

## Waarom
Tijdens debugging en testen missen we zicht op de ruwe request/response‑data van externe bronsystemen. Dit maakt analyse onnodig lastig en vertraagt het oplossen van issues. De voorgestelde oplossing zorgt voor zo min mogelijk vervuiling in de echte code door alles via middleware en een aanpassing in onze request wrapper te doen.

## Hoe werkt het
1. elke inkomende request krijgt een `traceId`
2. voor elke request wordt een AsyncLocalStorage (ALS) context geopend
3. alle externe requests worden opgeslagen in een `events` array in die context
4. aan het einde van de Express‑response wordt de trace opgeslagen
5. ruwe data is nu opvraagbaar via het debug endpoint `/debug/:traceId`

## Belangrijk
Dit moet natuurlijk uitstaan op productie. Voor security/privacy en performance.

## Run
1. Start de applicatie
```
npm install
npm run dev
```

2. Ga naar:
http://localhost:3000/service/a

3. De response toont:
- de traceId  
- een URL om de trace op te halen  

4. Ga vervolgens naar:
http://localhost:3000/debug/<traceId>

5. Wat je ziet:
```
{
  "traceId": "3a0ad16b-e075-4688-91fa-dbe4446a95b6",
  "events": [
    {
      "timestamp": 1767292556843,
      "request": {
        "url": "https://mock.api/hello",
        "method": "POST",
        "body": {
          "message": "hello"
        }
      },
      "response": {
        "status": 200,
        "body": {
          "message": "world",
          "received": {
            "message": "hello"
          }
        }
      }
    }
  ]
}
```