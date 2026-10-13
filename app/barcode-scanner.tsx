
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";

export default function BarcodeScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#285C3B" />
        <Text>Checking camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera permission required</Text>
        <Text style={styles.subtitle}>
          Allow camera access to scan packaged food barcodes.
        </Text>
        <Pressable
          style={styles.button}
          onPress={() => void requestPermission()}
        >
          <Text style={styles.buttonText}>Allow camera</Text>
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"],
        }}
        onBarcodeScanned={
          scanned
            ? undefined
            : ({ data }) => {
                setScanned(true);
                router.replace({
                  pathname: "/dietary-needs",
                  params: { barcode: data },
                });
              }
        }
      />

      <View style={styles.overlay}>
        <Pressable
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>✕ Close</Text>
        </Pressable>

        <View style={styles.instructions}>
          <Text style={styles.title}>Scan a product</Text>
          <Text style={styles.subtitle}>
            Position the barcode inside the frame.
          </Text>
          <View style={styles.scanFrame} />
          <Text style={styles.subtitle}>
            Keep the barcode steady and well lit.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#101510" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F8F6",
    padding: 24,
    gap: 16,
  },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
    padding: 24,
    paddingTop: 60,
    paddingBottom: 70,
  },
  closeButton: {
    alignSelf: "flex-start",
    backgroundColor: "#285C3B",
    borderRadius: 12,
    padding: 12,
  },
  instructions: { alignItems: "center", gap: 18 },
  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: "white",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  scanFrame: {
    width: 280,
    height: 150,
    borderWidth: 3,
    borderColor: "white",
    borderRadius: 18,
    backgroundColor: "transparent",
  },
  button: {
    backgroundColor: "#285C3B",
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 12,
  },
  buttonText: { color: "white", fontWeight: "700" },
  backText: { color: "#285C3B", fontWeight: "700" },
});
