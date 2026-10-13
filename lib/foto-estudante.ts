// O Drive entrega miniaturas menores sem baixar a foto original.
export function urlFotoEstudante(valor: string) {
  try {
    const url = new URL(valor);
    if (url.hostname !== 'drive.google.com') return valor;
    const id = url.searchParams.get('id') || url.pathname.match(/\/file\/d\/([^/]+)/)?.[1];
    if (!id || !/^[\w-]+$/.test(id)) return valor;
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w640`;
  } catch {
    return valor;
  }
}

export function podeOtimizarFoto(valor: string) {
  try {
    const url = new URL(valor);
    return url.protocol === 'https:' && ['drive.google.com', 'lh3.googleusercontent.com'].includes(url.hostname);
  } catch {
    return false;
  }
}
