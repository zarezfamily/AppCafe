import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { THEME } from '../constants/theme';
import { normalize } from '../core/utils';
import { shared } from '../styles/sharedStyles';

export default function SearchInput({ value, onChangeText, onSearch, allCafes, placeholder }) {
  const [suggestions, setSuggestions] = useState([]);
  const [show, setShow] = useState(false);

  const handleChange = (text) => {
    onChangeText(text);
    if (text.length < 2) {
      setSuggestions([]);
      setShow(false);
      return;
    }
    const q = normalize(text);
    const seen = new Set();
    const matches = [];
    allCafes.forEach((c) => {
      [c.marca, c.nombre, c.pais, c.region, c.variedad, c.proceso, c.notas].forEach((raw) => {
        const field = typeof raw === 'string' ? raw : '';
        if (!field) return;
        if (normalize(field).includes(q) && !seen.has(field.toLowerCase())) {
          seen.add(field.toLowerCase());
          matches.push(field);
        }
        field.split(/[\s,·]+/).forEach((w) => {
          if (normalize(w).startsWith(q) && w.length > 2 && !seen.has(w.toLowerCase())) {
            seen.add(w.toLowerCase());
            matches.push(w);
          }
        });
      });
    });
    setSuggestions(matches.slice(0, 6));
    setShow(matches.length > 0);
  };

  const selectSuggestion = (word) => {
    onChangeText(word);
    setShow(false);
    onSearch?.(word);
  };

  const handleSearch = () => {
    setShow(false);
    onSearch?.(value);
  };

  return (
    <View style={{ position: 'relative', zIndex: 100 }}>
      <View style={shared.searchWrap}>
        <TouchableOpacity onPress={handleSearch}>
          <Ionicons name="search-outline" size={18} color="#999" />
        </TouchableOpacity>
        <TextInput
          style={shared.searchInput}
          placeholder={placeholder || 'Buscar...'}
          placeholderTextColor="#999"
          value={value}
          onChangeText={handleChange}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => value.length >= 2 && setShow(suggestions.length > 0)}
          onBlur={() => setTimeout(() => setShow(false), 200)}
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              onChangeText('');
              setSuggestions([]);
              setShow(false);
              onSearch?.('');
            }}
          >
            <Ionicons name="close-circle" size={18} color="#ccc" />
          </TouchableOpacity>
        )}
      </View>
      {show && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          {suggestions.map((sg, i) => (
            <TouchableOpacity key={i} style={styles.suggItem} onPress={() => selectSuggestion(sg)}>
              <Ionicons name="search-outline" size={14} color={THEME.icon.muted} />
              <Text style={styles.suggText}>{sg}</Text>
              <Ionicons
                name="arrow-up-outline"
                size={12}
                color="#ddd"
                style={{ marginLeft: 'auto', transform: [{ rotate: '45deg' }] }}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    position: 'absolute',
    top: 54,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    zIndex: 200,
  },
  suggItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f5f5f5',
  },
  suggText: { fontSize: 14, color: '#333', flex: 1 },
});
