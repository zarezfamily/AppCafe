import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { queryCollection, updateDocument } from '../services/firestoreService';

const FILTERS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

function isValidEAN13(code) {
  const value = String(code || '')
    .replace(/\s+/g, '')
    .trim();
  if (!value) return true;
  if (!/^\d{13}$/.test(value)) return false;

  const digits = value.split('').map(Number);
  const checkDigit = digits[12];

  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }

  const calculated = (10 - (sum % 10)) % 10;
  return calculated === checkDigit;
}

function FilterChip({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? '#caa27c' : '#2a2a2a',
        backgroundColor: active ? '#2b1d15' : '#161616',
      }}
    >
      <Text
        style={{
          color: active ? '#f4d7b8' : '#c7c7c7',
          fontSize: 12,
          fontWeight: '800',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

async function fetchCoffeeCountByStatus(status) {
  const docs = await queryCollection('coffees', 'reviewStatus', status);
  return docs.length;
}

export default function AdminPanelScreen() {
  const [cafes, setCafes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState(FILTERS.PENDING);
  const [search, setSearch] = useState('');
  const [counters, setCounters] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const [editingCoffee, setEditingCoffee] = useState(null);
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editEan, setEditEan] = useState('');
  const [editIsSpecialty, setEditIsSpecialty] = useState(false);
  const [editReviewStatus, setEditReviewStatus] = useState(FILTERS.PENDING);
  const [editAppVisible, setEditAppVisible] = useState(false);
  const [editScannerVisible, setEditScannerVisible] = useState(true);
  const [editError, setEditError] = useState('');

  const loadCounters = useCallback(async () => {
    try {
      const [pending, approved, rejected] = await Promise.all([
        fetchCoffeeCountByStatus(FILTERS.PENDING),
        fetchCoffeeCountByStatus(FILTERS.APPROVED),
        fetchCoffeeCountByStatus(FILTERS.REJECTED),
      ]);

      setCounters({ pending, approved, rejected });
    } catch (e) {
      console.log('Error cargando contadores:', e);
    }
  }, []);

  const loadCafes = useCallback(
    async (status = activeFilter) => {
      try {
        const data = await queryCollection('coffees', 'reviewStatus', status);
        setCafes(data);
      } catch (e) {
        console.log('Error cargando cafés:', e);
      }
    },
    [activeFilter]
  );

  const refreshCurrentView = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadCafes(activeFilter), loadCounters()]);
    } finally {
      setRefreshing(false);
    }
  }, [activeFilter, loadCafes, loadCounters]);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      setLoading(true);
      try {
        await Promise.all([loadCafes(activeFilter), loadCounters()]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [activeFilter, loadCafes, loadCounters]);

  const approveSpecialty = async (coffee) => {
    await updateDocument('coffees', coffee.id, {
      reviewStatus: FILTERS.APPROVED,
      isSpecialty: true,
      appVisible: true,
      scannerVisible: true,
    });
    await refreshCurrentView();
  };

  const approveNoSpecialty = async (coffee) => {
    await updateDocument('coffees', coffee.id, {
      reviewStatus: FILTERS.APPROVED,
      isSpecialty: false,
      appVisible: false,
      scannerVisible: true,
    });
    await refreshCurrentView();
  };

  const rejectCoffee = async (coffee) => {
    await updateDocument('coffees', coffee.id, {
      reviewStatus: FILTERS.REJECTED,
      appVisible: false,
      scannerVisible: false,
    });
    await refreshCurrentView();
  };

  const recoverCoffee = async (coffee) => {
    await updateDocument('coffees', coffee.id, {
      reviewStatus: FILTERS.PENDING,
      appVisible: false,
      scannerVisible: true,
    });
    await refreshCurrentView();
  };

  const openEditor = (coffee) => {
    setEditingCoffee(coffee);
    setEditName(coffee?.name || coffee?.nombre || '');
    setEditBrand(coffee?.brand || coffee?.roaster || '');
    setEditEan(coffee?.ean || '');
    setEditIsSpecialty(!!coffee?.isSpecialty);
    setEditReviewStatus(coffee?.reviewStatus || FILTERS.PENDING);
    setEditAppVisible(!!coffee?.appVisible);
    setEditScannerVisible(coffee?.scannerVisible !== false);
    setEditError('');
  };

  const closeEditor = () => {
    setEditingCoffee(null);
    setEditName('');
    setEditBrand('');
    setEditEan('');
    setEditIsSpecialty(false);
    setEditReviewStatus(FILTERS.PENDING);
    setEditAppVisible(false);
    setEditScannerVisible(true);
    setEditError('');
  };

  const saveEdition = async () => {
    if (!editingCoffee?.id) return;

    const normalizedEan = String(editEan || '')
      .replace(/\s+/g, '')
      .trim();

    if (normalizedEan && !isValidEAN13(normalizedEan)) {
      setEditError('El EAN debe tener 13 dígitos válidos.');
      return;
    }

    if (normalizedEan) {
      const sameEanDocs = await queryCollection('coffees', 'ean', normalizedEan);
      const duplicate = sameEanDocs.find((docItem) => docItem.id !== editingCoffee.id);
      if (duplicate) {
        setEditError('Ya existe otro café con ese EAN en la base de datos.');
        return;
      }
    }

    await updateDocument('coffees', editingCoffee.id, {
      name: editName,
      brand: editBrand,
      ean: normalizedEan,
      isSpecialty: editIsSpecialty,
      reviewStatus: editReviewStatus,
      appVisible: editAppVisible,
      scannerVisible: editScannerVisible,
    });

    closeEditor();
    await refreshCurrentView();
  };

  const renderActions = (item) => {
    if (activeFilter === FILTERS.REJECTED) {
      return (
        <>
          <TouchableOpacity onPress={() => recoverCoffee(item)}>
            <Text style={{ color: '#ff0' }}>↺ Volver a pendientes</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => openEditor(item)}>
            <Text style={{ color: '#6cf' }}>✎ Editar</Text>
          </TouchableOpacity>
        </>
      );
    }

    if (activeFilter === FILTERS.APPROVED) {
      return (
        <>
          <TouchableOpacity onPress={() => approveSpecialty(item)}>
            <Text style={{ color: '#0f0' }}>✔ Specialty</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => approveNoSpecialty(item)}>
            <Text style={{ color: '#ff0' }}>✔ No Specialty</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => rejectCoffee(item)}>
            <Text style={{ color: '#f00' }}>✖ Rechazar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openEditor(item)}>
            <Text style={{ color: '#6cf' }}>✎ Editar</Text>
          </TouchableOpacity>
        </>
      );
    }

    return (
      <>
        <TouchableOpacity onPress={() => approveSpecialty(item)}>
          <Text style={{ color: '#0f0' }}>✔ Specialty</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => approveNoSpecialty(item)}>
          <Text style={{ color: '#ff0' }}>✔ No Specialty</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => rejectCoffee(item)}>
          <Text style={{ color: '#f00' }}>✖ Rechazar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => openEditor(item)}>
          <Text style={{ color: '#6cf' }}>✎ Editar</Text>
        </TouchableOpacity>
      </>
    );
  };

  const headerText = useMemo(() => {
    if (activeFilter === FILTERS.APPROVED) return 'Cafés aprobados';
    if (activeFilter === FILTERS.REJECTED) return 'Cafés rechazados';
    return 'Cafés pendientes';
  }, [activeFilter]);

  const visibleCafes = useMemo(() => {
    const term = String(search || '')
      .trim()
      .toLowerCase();
    if (!term) return cafes;

    return cafes.filter((item) => {
      const haystack = [item.name, item.nombre, item.brand, item.roaster, item.ean]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [cafes, search]);

  const renderItem = ({ item }) => (
    <View
      style={{
        padding: 12,
        marginBottom: 12,
        borderRadius: 12,
        backgroundColor: '#111',
      }}
    >
      {item.foto && (
        <Image
          source={{ uri: item.foto }}
          style={{ width: '100%', height: 120, borderRadius: 8, marginBottom: 8 }}
        />
      )}

      <Text style={{ color: '#fff', fontWeight: 'bold' }}>
        {item.name || item.nombre || 'Sin nombre'}
      </Text>

      <Text style={{ color: '#aaa' }}>{item.brand || item.roaster || 'Marca desconocida'}</Text>

      <Text style={{ color: '#666', fontSize: 12, marginTop: 4 }}>EAN: {item.ean || '—'}</Text>

      <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
        Estado: {item.reviewStatus || FILTERS.PENDING}
      </Text>

      <Text style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
        Specialty: {item.isSpecialty ? 'Sí' : 'No'}
      </Text>

      <View style={{ flexDirection: 'row', marginTop: 10, gap: 12, flexWrap: 'wrap' }}>
        {renderActions(item)}
      </View>
    </View>
  );

  if (loading) {
    return <Text style={{ color: '#fff', padding: 16 }}>Cargando...</Text>;
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ color: '#fff', fontSize: 22, marginBottom: 12, fontWeight: '800' }}>
        Panel Admin
      </Text>

      <Text style={{ color: '#aaa', marginBottom: 14 }}>
        Revisa cafés pendientes, aprobados o rechazados y cambia su clasificación.
      </Text>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar por nombre, marca o EAN"
        placeholderTextColor="#777"
        style={{
          backgroundColor: '#111',
          borderWidth: 1,
          borderColor: '#2a2a2a',
          color: '#fff',
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          marginBottom: 14,
        }}
      />

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <FilterChip
          label={`Pendientes (${counters.pending})`}
          active={activeFilter === FILTERS.PENDING}
          onPress={() => setActiveFilter(FILTERS.PENDING)}
        />
        <FilterChip
          label={`Aprobados (${counters.approved})`}
          active={activeFilter === FILTERS.APPROVED}
          onPress={() => setActiveFilter(FILTERS.APPROVED)}
        />
        <FilterChip
          label={`Rechazados (${counters.rejected})`}
          active={activeFilter === FILTERS.REJECTED}
          onPress={() => setActiveFilter(FILTERS.REJECTED)}
        />
      </View>

      <Text style={{ color: '#c7c7c7', marginBottom: 12, fontWeight: '700' }}>{headerText}</Text>

      <Modal
        visible={!!editingCoffee}
        transparent
        animationType="slide"
        onRequestClose={closeEditor}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.7)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: '#151515',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 16,
              maxHeight: '85%',
            }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 14 }}>
                Editar café
              </Text>

              <Text style={{ color: '#aaa', marginBottom: 6 }}>Nombre</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Nombre"
                placeholderTextColor="#777"
                style={{
                  backgroundColor: '#111',
                  borderWidth: 1,
                  borderColor: '#2a2a2a',
                  color: '#fff',
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  marginBottom: 12,
                }}
              />

              <Text style={{ color: '#aaa', marginBottom: 6 }}>Marca / Roaster</Text>
              <TextInput
                value={editBrand}
                onChangeText={setEditBrand}
                placeholder="Marca"
                placeholderTextColor="#777"
                style={{
                  backgroundColor: '#111',
                  borderWidth: 1,
                  borderColor: '#2a2a2a',
                  color: '#fff',
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  marginBottom: 12,
                }}
              />

              <Text style={{ color: '#aaa', marginBottom: 6 }}>EAN</Text>
              <TextInput
                value={editEan}
                onChangeText={setEditEan}
                placeholder="EAN"
                placeholderTextColor="#777"
                autoCapitalize="none"
                keyboardType="number-pad"
                style={{
                  backgroundColor: '#111',
                  borderWidth: 1,
                  borderColor: '#2a2a2a',
                  color: '#fff',
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  marginBottom: 12,
                }}
              />

              {!!editError && (
                <Text style={{ color: '#ff8f8f', marginBottom: 12, fontWeight: '700' }}>
                  {editError}
                </Text>
              )}

              {!editError && (
                <Text style={{ color: '#888', marginBottom: 12, fontSize: 12 }}>
                  Deja el EAN vacío si todavía no está verificado.
                </Text>
              )}

              <Text style={{ color: '#aaa', marginBottom: 10 }}>Clasificación</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                <TouchableOpacity
                  onPress={() => setEditIsSpecialty(true)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: editIsSpecialty ? '#0f0' : '#2a2a2a',
                    backgroundColor: editIsSpecialty ? '#132413' : '#111',
                  }}
                >
                  <Text style={{ color: editIsSpecialty ? '#9f9' : '#ddd', fontWeight: '700' }}>
                    Specialty
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setEditIsSpecialty(false)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: !editIsSpecialty ? '#ff0' : '#2a2a2a',
                    backgroundColor: !editIsSpecialty ? '#2b2b12' : '#111',
                  }}
                >
                  <Text style={{ color: !editIsSpecialty ? '#ff9' : '#ddd', fontWeight: '700' }}>
                    No Specialty
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={{ color: '#aaa', marginBottom: 10 }}>Estado de revisión</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                <TouchableOpacity
                  onPress={() => setEditReviewStatus(FILTERS.PENDING)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: editReviewStatus === FILTERS.PENDING ? '#caa27c' : '#2a2a2a',
                    backgroundColor: editReviewStatus === FILTERS.PENDING ? '#2b1d15' : '#111',
                  }}
                >
                  <Text
                    style={{
                      color: editReviewStatus === FILTERS.PENDING ? '#f4d7b8' : '#ddd',
                      fontWeight: '700',
                    }}
                  >
                    Pendiente
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setEditReviewStatus(FILTERS.APPROVED)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: editReviewStatus === FILTERS.APPROVED ? '#0f0' : '#2a2a2a',
                    backgroundColor: editReviewStatus === FILTERS.APPROVED ? '#132413' : '#111',
                  }}
                >
                  <Text
                    style={{
                      color: editReviewStatus === FILTERS.APPROVED ? '#9f9' : '#ddd',
                      fontWeight: '700',
                    }}
                  >
                    Aprobado
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setEditReviewStatus(FILTERS.REJECTED)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: editReviewStatus === FILTERS.REJECTED ? '#f55' : '#2a2a2a',
                    backgroundColor: editReviewStatus === FILTERS.REJECTED ? '#2b1212' : '#111',
                  }}
                >
                  <Text
                    style={{
                      color: editReviewStatus === FILTERS.REJECTED ? '#ff9f9f' : '#ddd',
                      fontWeight: '700',
                    }}
                  >
                    Rechazado
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={{ color: '#aaa', marginBottom: 10 }}>Visibilidad</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                <TouchableOpacity
                  onPress={() => setEditAppVisible(!editAppVisible)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: editAppVisible ? '#0f0' : '#2a2a2a',
                    backgroundColor: editAppVisible ? '#132413' : '#111',
                  }}
                >
                  <Text style={{ color: editAppVisible ? '#9f9' : '#ddd', fontWeight: '700' }}>
                    App visible: {editAppVisible ? 'Sí' : 'No'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setEditScannerVisible(!editScannerVisible)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: editScannerVisible ? '#caa27c' : '#2a2a2a',
                    backgroundColor: editScannerVisible ? '#2b1d15' : '#111',
                  }}
                >
                  <Text
                    style={{ color: editScannerVisible ? '#f4d7b8' : '#ddd', fontWeight: '700' }}
                  >
                    Scanner visible: {editScannerVisible ? 'Sí' : 'No'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={closeEditor}
                  style={{
                    flex: 1,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#2a2a2a',
                    paddingVertical: 14,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#ddd', fontWeight: '700' }}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={saveEdition}
                  style={{
                    flex: 1,
                    borderRadius: 12,
                    backgroundColor: '#2b1d15',
                    borderWidth: 1,
                    borderColor: '#caa27c',
                    paddingVertical: 14,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#f4d7b8', fontWeight: '800' }}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <FlatList
        data={visibleCafes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onRefresh={refreshCurrentView}
        refreshing={refreshing}
        ListEmptyComponent={
          <View
            style={{
              padding: 16,
              borderRadius: 12,
              backgroundColor: '#111',
            }}
          >
            <Text style={{ color: '#aaa' }}>
              {search
                ? 'No hay cafés que coincidan con la búsqueda.'
                : 'No hay cafés en este estado.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}
