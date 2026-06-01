function normalizarTexto(valor: unknown) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function isGestao(perfil?: string) {
  const perfilNormalizado = normalizarTexto(perfil);

  return perfilNormalizado === 'gestao' || perfilNormalizado === 'gestor';
}

export function estaAtivo(valor: unknown) {
  return !['nao', 'false', '0'].includes(String(valor || '').trim().toLowerCase());
}
