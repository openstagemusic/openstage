/**
 * JSON-LD pronto per la pagina.
 *
 * I testi arrivano dal database: `<` va neutralizzato, altrimenti un nome che
 * contiene `</script>` potrebbe chiudere il blocco e iniettare markup.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
