
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PHOTOS_ENDPOINT } from '../config/api';

export default function PhotoScreen() {
  const { uri, mode = 'preview', id, date } = useLocalSearchParams();
  const [uploading, setUploading] = useState(false);

  // Envía la fotografía seleccionada al servidor mediante una petición POST.
  const handleUpload = async () => {
    if (uploading) return;

    setUploading(true);

    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || `photo_${Date.now()}.jpg`;

      formData.append('image', {
        uri,
        name: filename,
        type: 'image/jpeg',
      });

      // Se utiliza FormData para enviar la imagen sin configurar manualmente el Content-Type.
      const response = await fetch(PHOTOS_ENDPOINT, {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Error del servidor (${response.status}): ${errorText}`
        );
      }

      Alert.alert('¡Listo!', 'La fotografía se subió correctamente.', [
        {
          text: 'Ver galería',
          onPress: () => router.dismissAll(),
        },
      ]);
    } catch (error) {
      Alert.alert(
        'Error al subir',
        error.message || 'No se pudo conectar con el servidor.'
      );
    } finally {
      setUploading(false);
    }
  };

  // Elimina del servidor la fotografía que se está visualizando.
  const handleDelete = () => {
    Alert.alert(
      'Eliminar foto',
      '¿Seguro que deseas borrar esta foto del servidor?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setUploading(true);

            try {
              const response = await fetch(`${PHOTOS_ENDPOINT}${id}/`, {
                method: 'DELETE',
              });

              if (!response.ok) {
                throw new Error(
                  `No se pudo eliminar (${response.status})`
                );
              }

              router.back();
            } catch (error) {
              Alert.alert('Error', error.message);
            } finally {
              setUploading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Image source={{ uri }} style={styles.image} resizeMode="contain" />

      {/* Muestra la fecha de la fotografía cuando se consulta desde la galería. */}
      {mode === 'view' && date ? (
        <View style={styles.dateBadge}>
          <Text style={styles.dateText}>{date}</Text>
        </View>
      ) : null}

      {/* Los botones cambian dependiendo de si es una foto nueva o una ya guardada. */}
      <View style={styles.actions}>
        {mode === 'preview' ? (
          <>
            <Pressable
              style={[styles.primary, uploading && styles.disabled]}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <View style={styles.row}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.primaryText}>Subiendo foto...</Text>
                </View>
              ) : (
                <Text style={styles.primaryText}>Enviar al servidor</Text>
              )}
            </Pressable>

            <Pressable
              style={[styles.secondary, uploading && styles.disabled]}
              onPress={() => router.back()}
              disabled={uploading}
            >
              <Text style={styles.secondaryText}>Volver a tomar</Text>
            </Pressable>
          </>
        ) : (
          <>
            {id ? (
              <Pressable
                style={[styles.danger, uploading && styles.disabled]}
                onPress={handleDelete}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryText}>Eliminar foto</Text>
                )}
              </Pressable>
            ) : null}

            <Pressable
              style={styles.secondary}
              onPress={() => router.back()}
            >
              <Text style={styles.secondaryText}>Cerrar</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

// Estilos para la visualización de la fotografía y sus botones de acción.
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  image: { flex: 1 },
  dateBadge: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  dateText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  actions: {
    position: 'absolute',
    bottom: 48,
    left: 24,
    right: 24,
    gap: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  primary: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: 'center',
  },
  danger: {
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: 'center',
  },
  primaryText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  secondary: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: 'center',
  },
  secondaryText: { fontSize: 16, fontWeight: '700', color: '#000' },
  disabled: { opacity: 0.6 },
});
