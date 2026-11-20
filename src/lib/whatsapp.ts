export function whatsappNumber(phone?: string) {
  const compact = phone?.trim().replace(/[\s().-]/g, '') ?? '';
  if (/^[6789][0-9]{8}$/.test(compact)) return `34${compact}`;
  if (/^34[6789][0-9]{8}$/.test(compact)) return compact;
  const international = compact.replace(/^(\+|00)/, '');
  if (!/^(\+|00)/.test(compact) || !/^[1-9][0-9]{6,14}$/.test(international)) return null;
  if (international.startsWith('34') && !/^34[6789][0-9]{8}$/.test(international)) return null;
  return international;
}
