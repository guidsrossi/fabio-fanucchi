export function isGestao(perfil?: string) {
  return perfil === 'gestao' || perfil === 'gestor';
}

export function estaAtivo(valor: unknown) {
  return !['nao', 'false', '0'].includes(String(valor || '').trim().toLowerCase());
}
