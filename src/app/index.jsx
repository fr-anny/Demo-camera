
import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { normalizePhoto, PHOTOS_ENDPOINT, SERIAL_NUMBER } from '../config/api';

export default function HomeScreen() {
  // Estados para almacenar las fotos y controlar la carga de información.
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Consulta las fotografías registradas en el servidor y actualiza la lista.
  const fetchPhotos = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const response = await fetch(PHOTOS_ENDPOINT);

      if (!response.ok) {
        throw new Error(`Error del servidor (${response.status})`);
      }

      const data = await response.json();
      const list = Array.isArray(data) ? data : data.results || [];

      setPhotos(list.map(normalizePhoto));
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las fotos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Actualiza las fotografías cada vez que se regresa a esta pantalla.
  useFocusEffect(
    useCallback(() => {
      fetchPhotos();
    }, [fetchPhotos])
  );

  // Permite seleccionar una imagen de la galería y prepararla para visualizarla.
  const handlePickFromGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!perm.granted) {
        Alert.alert(
          'Permiso requerido',
          'Necesitamos acceso a tu galería para elegir una imagen.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;

      const selectedUri = result.assets[0].uri;

      // Reduce el tamaño y comprime la imagen antes de utilizarla.
      const context = ImageManipulator.manipulate(selectedUri);
      context.resize({ width: 1080 });

      const imageRef = await context.renderAsync();
      const compressed = await imageRef.saveAsync({
        compress: 0.7,
        format: SaveFormat.JPEG,
      });

      let finalUri = compressed.uri;

      // Guarda una copia en el almacenamiento de la aplicación para conservarla.
      if (Platform.OS !== 'web') {
        const fileName = `gallery_${Date.now()}.jpg`;
        const sourceFile = new File(compressed.uri);
        const permanentFile = new File(Paths.document, fileName);

        sourceFile.copy(permanentFile);
        finalUri = permanentFile.uri;
      }

      router.push({
        pathname: '/photo',
        params: { uri: finalUri, mode: 'preview' },
      });
    } catch (err) {
      Alert.alert(
        'Error',
        'No se pudo cargar la imagen de la galería: ' + err.message
      );
    }
  };

  // Elimina una fotografía del servidor después de confirmar la acción.
  const handleDelete = (item) => {
    Alert.alert('Borrar foto', '¿Deseas eliminar esta foto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await fetch(`${PHOTOS_ENDPOINT}${item.id}/`, {
              method: 'DELETE',
            });

            if (!response.ok) throw new Error(`Error ${response.status}`);

            // Quita de la lista la foto que se eliminó correctamente.
            setPhotos((prev) => prev.filter((p) => p.id !== item.id));
          } catch (err) {
            Alert.alert('Error al borrar', err.message);
          }
        },
      },
    ]);
  };

  // Estructura de cada fotografía que aparece en la lista.
  const renderItem = ({ item }) => (
    <Pressable
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: '/photo',
          params: {
            uri: item.uri,
            mode: 'view',
            id: String(item.id),
            date: item.date,
          },
        })
      }
    >
      <Image
        source={{ uri: item.uri }}
        style={styles.thumbnail}
        resizeMode="cover"
      />

      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>{item.date}</Text>

        <Pressable
          style={styles.deleteBtn}
          onPress={() => handleDelete(item)}
        >
          <Text style={styles.deleteBtnText}>Borrar</Text>
        </Pressable>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Encabezado con los datos del usuario y las opciones para agregar fotos. */}
      <View style={styles.header}>
        <Text style={styles.title}>Mis Fotos</Text>
        <Text style={styles.subtitle}>Matrícula: {SERIAL_NUMBER}</Text>

        <View style={styles.buttonRow}>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => router.push('/camera')}
          >
            <Text style={styles.primaryBtnText}>Tomar foto</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryBtn}
            onPress={handlePickFromGallery}
          >
            <Text style={styles.secondaryBtnText}>Galería</Text>
          </Pressable>
        </View>
      </View>

      {/* Muestra el contenido según el estado de la consulta al servidor. */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.infoText}>Cargando fotografías...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>

          <Pressable style={styles.retryBtn} onPress={() => fetchPhotos()}>
            <Text style={styles.primaryBtnText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={
            photos.length === 0 ? styles.emptyContainer : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchPhotos(true)}
            />
          }
          ListEmptyComponent={
            <Text style={styles.infoText}>
              Todavía no hay fotos subidas. ¡Toma la primera!
            </Text>
          }
        />
      )}
    </View>
  );
}

// Estilos de los botones, encabezado, tarjetas y lista de fotografías.
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingTop: 56 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  title: { fontSize: 26, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b' },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  primaryBtn: {
    flex: 2,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#0f172a', fontSize: 16, fontWeight: '600' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  infoText: { fontSize: 15, color: '#64748b', textAlign: 'center' },
  errorText: {
    fontSize: 15,
    color: '#dc2626',
    textAlign: 'center',
    fontWeight: '600',
  },
  retryBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  listContent: { padding: 16, gap: 16 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  thumbnail: { width: '100%', height: 220, backgroundColor: '#e2e8f0' },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  cardDate: { fontSize: 13, color: '#475569', fontWeight: '500' },
  deleteBtn: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteBtnText: { color: '#dc2626', fontSize: 13, fontWeight: '700' },
});
