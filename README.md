# Treno dei 38

## ⚠️⚠️ Se sei un mio futuro employer non guardare il codice o leggi sotto

Problema: quando tornavo a casa dalle superiori (e adesso dall'università) avevo bisogno di sapere gli orari in tempo reale dell'autobus da scuola alla stazione e del treno da Modena alla mia stazione.

Soluzione: [trenodei38](https://trenodei38.bitrey.it), che fornisce i dati in tempo reale per ciascuna fermata SETA, TPER e addirittura ogni treno e stazione di Trenitalia.

Il codice è una spaghettata ma poco importa, questo è sempre dovuto essere un progettino stupido e ignorante, in realtà il server è sorprendentemente advanced visto che fa un parsing dell'[API obbrobriosa della TPER](https://hellobuswsweb.tper.it/web-services/hello-bus.asmx?op=QueryHellobus) anche meglio dell'app semi-ufficiale (e forse pure meglio di Google Maps), ma lo stesso non è che mi sia impegnato ad aggiungere nuova roba né ho intenzione di farlo.

Usa anche l' """API""" di Trenitalia  [ViaggiaTreno](http://www.viaggiatreno.it/infomobilitamobile/rest-jsapi "ViaggiaTreno").

`geolocation` è un servizio websocket che permette di tracciare l'host (in questo caso, io quando la mattina giravo con la macchina per passare a prendere due miei amici e andare in stazione) con una visualizzazione su mappa OpenStreetMap.
