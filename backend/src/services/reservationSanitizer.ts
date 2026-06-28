/**
 * Sanitiza e valida os dados brutos de uma reserva recebida via webhook.
 * Responsabilidade única: limpeza de dados de entrada.
 */

export interface SanitizedCustomer {
    first_name: string;
    last_name: string;
    country: string;
    passport: string | null;
    cpf: string | null;
    birth_date: string | null;
    gender: string;
    email: string;
    whatsapp_phone: string;
}

/**
 * Converte strings vazias, "--" ou undefined para null.
 */
function sanitizeField(value: unknown): string | null {
    if (!value || value === '--' || String(value).trim() === '') return null;
    return String(value);
}

/**
 * Valida e normaliza datas no formato YYYY-MM-DD.
 * Retorna null se o valor for inválido.
 */
function sanitizeBirthDate(date: unknown): string | null {
    const val = sanitizeField(date);
    if (!val) return null;
    return /^\d{4}-\d{2}-\d{2}/.test(val) ? val.substring(0, 10) : null;
}

export function sanitizeCustomer(customer: Record<string, unknown>): SanitizedCustomer {
    return {
        first_name: String(customer.first_name ?? ''),
        last_name: String(customer.last_name ?? ''),
        country: String(customer.country ?? ''),
        gender: String(customer.gender ?? ''),
        email: String(customer.email ?? ''),
        whatsapp_phone: String(customer.whatsapp_phone ?? ''),
        birth_date: sanitizeBirthDate(customer.birth_date),
        passport: sanitizeField(customer.passport),
        cpf: sanitizeField(customer.cpf),
    };
}

/**
 * Valida os campos obrigatórios APÓS a sanitização.
 * Retorna a lista de campos faltantes, ou array vazio se OK.
 */
export function getMissingFields(
    internal_id: unknown,
    customer: SanitizedCustomer,
    flight: Record<string, unknown> | undefined
): string[] {
    const missing: string[] = [];
    if (!internal_id) missing.push('internal_id');
    if (!customer.first_name) missing.push('customer.first_name');
    if (!flight?.route) missing.push('flight.route');
    return missing;
}
