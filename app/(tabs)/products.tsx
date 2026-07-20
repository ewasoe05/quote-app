import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';

export default function ProductsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Products</Text>
      <View
        style={styles.separator}
        lightColor="#eee"
        darkColor="rgba(255,255,255,0.1)"
      />
      <Text style={styles.subtitle}>
        Maintain softeners, RO systems, iron filters, and add-ons.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    opacity: 0.7,
  },
  separator: {
    marginVertical: 24,
    height: 1,
    width: '80%',
  },
});
