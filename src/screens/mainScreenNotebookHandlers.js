export function createMainScreenNotebookHandlers({
  user,
  notebook,
  addDocument,
  deleteDocument,
  queryCollection,
  uploadImageToStorage,
  showDialog,
}) {
  const cargarCatas = async () => {
    if (!user?.uid) return;
    notebook.setCargando(true);
    try {
      const mias = await queryCollection('diario_catas', 'uid', user.uid);
      const ordenadas = (mias || []).sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora));
      notebook.setCatas(ordenadas);
    } catch (error) {
      console.error('Error cargar catas:', error);
    } finally {
      notebook.setCargando(false);
    }
  };

  const guardarCata = async () => {
    if (!notebook.cafeNombre.trim()) {
      showDialog('Aviso', 'Ingresa el nombre del café');
      return;
    }

    notebook.setGuardando(true);
    try {
      let fotoUrl = notebook.foto;
      let fotoOmitidaPorPermisos = false;

      if (notebook.foto && !notebook.foto.startsWith('http')) {
        try {
          fotoUrl = await uploadImageToStorage(notebook.foto, 'diario_catas');
        } catch (uploadError) {
          const uploadMessage = String(uploadError?.message || '');
          if (uploadMessage.toLowerCase().includes('permission denied')) {
            fotoUrl = '';
            fotoOmitidaPorPermisos = true;
          } else {
            throw uploadError;
          }
        }
      }

      await addDocument('diario_catas', {
        uid: user.uid,
        cafeNombre: notebook.cafeNombre,
        cafeId: notebook.cafeId,
        fechaHora: notebook.fechaHora,
        metodoPreparacion: notebook.metodoPreparacion,
        dosis: Number(notebook.dosis) || 0,
        agua: Number(notebook.agua) || 0,
        temperatura: Number(notebook.temperatura) || 0,
        tiempoExtraccion: Number(notebook.tiempoExtraccion) || 0,
        puntuacion: notebook.puntuacion,
        notas: notebook.notas,
        foto: fotoUrl || '',
        contexto: notebook.contexto,
        createdAt: new Date().toISOString(),
      });

      await cargarCatas();
      if (fotoOmitidaPorPermisos) {
        showDialog(
          'Cata guardada',
          'La cata se guardó sin foto porque Firebase Storage rechazó la subida.'
        );
      }
      notebook.irCerrarModal();
    } catch (error) {
      showDialog('Error', 'No se pudo guardar la cata');
      console.error(error);
    } finally {
      notebook.setGuardando(false);
    }
  };

  const eliminarCata = async (cataId) => {
    showDialog('Confirmar', '¿Eliminar esta cata?', [
      { label: 'Cancelar' },
      {
        label: 'Eliminar',
        variant: 'danger',
        onPress: async () => {
          try {
            await deleteDocument('diario_catas', cataId);
            await cargarCatas();
            notebook.irCerrarDetail();
          } catch (error) {
            showDialog('Error', 'No se pudo eliminar la cata');
            console.error(error);
          }
        },
      },
    ]);
  };

  return {
    cargarCatas,
    guardarCata,
    eliminarCata,
  };
}
