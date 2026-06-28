export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5565999299529';
export const WHATSAPP_DISPLAY_NUMBER = '+55 65 99929-9529';
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

export const SUPPORTED_LANGUAGES = ['pt', 'en', 'es'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];
