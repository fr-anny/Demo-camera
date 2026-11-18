
import { CameraView, useCameraPermissions } from 'expo-camera';
import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// Comprime la fotografía y guarda una copia en los documentos de la aplicación.
async function compressAndSavePhoto(tempUri) {
  const context = ImageManipulator.manipulate(tempUri);
  context.resize({ width: 1080 });

  const imageRef = await context.renderAsync();
  const compressed = await imageRef.saveAsync({
    compress: 0.7,
    format: SaveFormat.JPEG,
  });

  if (Platform.OS === 'web') {
    return compressed.uri;
  }

  // Conserva la imagen en el almacenamiento de la aplicación para poder utilizarla después.
  const fileName = `photo_${Date.now()}.jpg`;
  const sourceFile = new File(compressed.uri);
  const permanentFile = new File(Paths.document, fileName);

  sourceFile.copy(permanentFile);

  return permanentFile.uri;
}

export default function CameraScreen() {
  const [facing, setFacing] = useState('back');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  // Verifica si ya se obtuvo el permiso para utilizar la cámara.
  if (!permission) {
    return <View style={styles.center} />;
  }

  // Muestra las opciones para solicitar el permiso o abrir los ajustes del teléfono.
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Permiso de cámara requerido</Text>

        <Text style={styles.message}>
          Necesitamos acceso a tu cámara para capturar fotografías y subirlas a tu galería en el servidor.
        </Text>

        {permission.canAskAgain && (
          <Pressable style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Conceder permiso</Text>
          </Pressable>
        )}

        <Pressable
          style={styles.settingsButton}
          onPress={() => Linking.openSettings()}
        >
          <Text style={styles.settingsButtonText}>Abrir ajustes del teléfono</Text>
        </Pressable>

        <Pressable style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Volver al inicio</Text>
        </Pressable>
      </View>
    );
  }

  // Cambia entre la cámara frontal y la trasera.
  const toggleFacing = () => {
    setReady(false);
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  // Captura la fotografía, la procesa y la envía a la pantalla de vista previa.
  const takePhoto = async () => {
    if (!ready || busy || !cameraRef.current) return;

    setBusy(true);

    try {
      const rawPhoto = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      const permanentUri = await compressAndSavePhoto(rawPhoto.uri);

      router.push({
        pathname: '/photo',
        params: { uri: permanentUri, mode: 'preview' },
      });
    } catch (error) {
      Alert.alert(
        'Error',
        'No se pudo procesar la fotografía: ' + error.message
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        onCameraReady={() => setReady(true)}
      />

      {/* Botón para salir de la cámara y regresar a la pantalla anterior. */}
      <Pressable style={styles.closeBtn} onPress={() => router.back()}>
        <Text style={styles.flipText}>Cancelar</Text>
      </Pressable>

      {/* Controles para capturar la fotografía y cambiar de cámara. */}
      <View style={styles.controls}>
        <View style={styles.side} />

        <Pressable
          style={[styles.shutter, (!ready || busy) && styles.disabled]}
          onPress={takePhoto}
          disabled={!ready || busy}
          accessibilityLabel="Tomar foto"
        >
          {busy ? (
            <ActivityIndicator color="#000" />
          ) : (
            <View style={styles.shutterInner} />
          )}
        </Pressable>

        <View style={styles.side}>
          <Pressable
            style={styles.flip}
            onPress={toggleFacing}
            accessibilityLabel="Cambiar cámara"
          >
            <Text style={styles.flipText}>Voltear</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// Estilos de la cámara, botones de control y pantalla de permisos.
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  settingsButton: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  settingsButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backLink: { marginTop: 8, padding: 8 },
  backLinkText: { color: '#64748b', fontSize: 15, fontWeight: '600' },
  closeBtn: {
    position: 'absolute',
    top: 56,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 48,
    paddingHorizontal: 24,
  },
  side: { flex: 1, alignItems: 'flex-end' },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
  },
  disabled: { opacity: 0.5 },
  flip: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  flipText: { color: '#fff', fontWeight: '600' },
});
