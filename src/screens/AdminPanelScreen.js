import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { queryCollection, updateDocument } from '../services/firestoreService';

const FILTERS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

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
  const [counters, setCounters] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });

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

  const renderActions = (item) => {
    if (activeFilter === FILTERS.REJECTED) {
      return (
        <TouchableOpacity onPress={() => recoverCoffee(item)}>
          <Text style={{ color: '#ff0' }}>↺ Volver a pendientes</Text>
        </TouchableOpacity>
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
      </>
    );
  };

  const headerText = useMemo(() => {
    if (activeFilter === FILTERS.APPROVED) return 'Cafés aprobados';
    if (activeFilter === FILTERS.REJECTED) return 'Cafés rechazados';
    return 'Cafés pendientes';
  }, [activeFilter]);

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

      <FlatList
        data={cafes}
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
            <Text style={{ color: '#aaa' }}>No hay cafés en este estado.</Text>
          </View>
        }
      />
    </View>
  );
}
