import { SupportedLanguage } from '@/config/constants';

const API_URL = 'https://ipapi.co/json/';
const TIMEOUT_MS = 3000;

export async function detectUserLanguage(): Promise<SupportedLanguage> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(API_URL, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    if (data && data.country_code) {
      const country = data.country_code.toUpperCase();

      const ptCountries = ['BR', 'PT', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL'];
      const esCountries = ['ES', 'AR', 'BO', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'SV', 'GQ', 'GT', 'HN', 'MX', 'NI', 'PA', 'PY', 'PE', 'PR', 'UY', 'VE'];

      if (ptCountries.includes(country)) {
        return 'pt';
      } else if (esCountries.includes(country)) {
        return 'es';
      }
    }
    
    return 'en';
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[detectUserLanguage] Timeout ao tentar detectar o idioma. Retornando padrão (en).');
    } else {
      console.error('[detectUserLanguage] Erro na detecção por IP:', error);
    }
    return 'en';
  } finally {
    clearTimeout(timeoutId);
  }
}
