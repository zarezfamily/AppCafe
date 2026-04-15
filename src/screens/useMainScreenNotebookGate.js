import { FREE_LIMITS } from '../core/premium';

export default function useMainScreenNotebookGate({ premium, notebook }) {
  const abrirNuevaCata = (cafeExistente = null) => {
    if (
      !cafeExistente &&
      !premium.isPremium &&
      notebook.catas.length >= FREE_LIMITS.diarioCatasMax
    ) {
      premium.requirePremium('diario_limit');
      return;
    }

    notebook.irAbrirModal(cafeExistente);
  };

  return {
    abrirNuevaCata,
  };
}
