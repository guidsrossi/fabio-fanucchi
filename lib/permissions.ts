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

export function isCoordenador(perfil?: string) {
  return normalizarTexto(perfil) === 'coordenador';
}

export function isProfessor(perfil?: string) {
  const perfilNormalizado = normalizarTexto(perfil);

  return perfilNormalizado === 'professor' || perfilNormalizado === 'coordenador';
}

export function estaAtivo(valor: unknown) {
  return !['nao', 'false', '0'].includes(String(valor || '').trim().toLowerCase());
}
