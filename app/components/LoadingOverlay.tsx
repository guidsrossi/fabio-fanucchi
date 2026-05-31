type Props = {
  show: boolean;
  message?: string;
};

export default function LoadingOverlay({ show, message = 'Carregando...' }: Props) {
  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-xs rounded-2xl border border-white/20 bg-white p-6 text-center shadow-2xl dark:bg-slate-950">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700 dark:border-white/10 dark:border-t-blue-400" />
        <p className="mt-4 font-bold text-slate-950 dark:text-white">{message}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Aguarde um instante.
        </p>
      </div>
    </div>
  );
}
