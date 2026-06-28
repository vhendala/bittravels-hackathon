/**
 * Serviço de busca de aeroportos local — ultrarápido, sem custo de API.
 * Os dados do airports.json ficam em memória RAM em tempo de execução,
 * garantindo respostas em milissegundos para o autocomplete do front-end.
 */
import rawData from './airports.json';

// ---------------------------------------------------------------------------
// Tipagem baseada na estrutura do airports.json
// ---------------------------------------------------------------------------
export interface Airport {
    icao: string;
    iata: string;
    name: string;
    city: string;
    state: string;
    country: string;
    elevation: number;
    lat: number;
    lon: number;
    tz: string;
}

// Formato normalizado de retorno para o front-end (compatível com as outras fontes)
export interface AirportResult {
    iataCode: string;
    name: string;
    cityName: string;
    countryName: string;
    type: 'AIRPORT';
}

// ---------------------------------------------------------------------------
// Pré-processamento em memória: filtra apenas aeroportos com IATA e normaliza
// Executado UMA ÚNICA VEZ no carregamento do módulo (startup do servidor)
// ---------------------------------------------------------------------------
const raw = rawData as Record<string, Airport>;

export const airportsData: AirportResult[] = Object.values(raw)
    // Regra crítica: remove qualquer aeroporto sem código IATA definido
    .filter((a) => a.iata && a.iata.trim() !== '')
    .map((a) => ({
        iataCode: a.iata.trim().toUpperCase(),
        name: a.name,
        cityName: a.city,
        countryName: a.country,
        type: 'AIRPORT' as const,
    }));

// Alias interno para uso pelos módulos desta pasta
const airportsWithIata = airportsData;

/**
 * Busca aeroportos localmente com filtro case-insensitive.
 * Pesquisa por código IATA, nome da cidade ou nome do aeroporto.
 *
 * @param q - Query de busca (mínimo 2 caracteres)
 * @param limit - Número máximo de resultados (padrão: 15)
 * @returns Array de aeroportos correspondentes
 */
export function searchLocalAirports(q: string, limit = 15): AirportResult[] {
    // Validação: query vazia ou muito curta retorna array vazio
    if (!q || q.length < 2) return [];

    const query = q.toLowerCase();

    const results: AirportResult[] = [];

    for (const airport of airportsWithIata) {
        // Prioridade: correspondência exata no IATA (ex: "GRU" -> Guarulhos)
        const isIataMatch = airport.iataCode.toLowerCase() === query;
        // Correspondência parcial no IATA, cidade ou nome do aeroporto
        const isPartialMatch =
            airport.iataCode.toLowerCase().includes(query) ||
            airport.cityName.toLowerCase().includes(query) ||
            airport.name.toLowerCase().includes(query);

        if (isIataMatch || isPartialMatch) {
            // Insere no início se for match exato de IATA, para ele aparecer primeiro
            if (isIataMatch) {
                results.unshift(airport);
            } else {
                results.push(airport);
            }

            // Para o loop tão logo tenhamos resultados suficientes + uma margem
            // (a margem permite reordenar mas evita iterar o arquivo inteiro)
            if (results.length >= limit * 2) break;
        }
    }

    return results.slice(0, limit);
}
