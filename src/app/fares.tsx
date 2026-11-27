import * as WebBrowser from 'expo-web-browser';
import { ScrollView, View } from 'react-native';

import { getTicketPrices } from '@/api/metro';
import { Brand, Button, Card, ErrorBox, Loading, T } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useTheme } from '@/hooks/use-theme';

export default function Fares() {
  const c = useTheme();
  const prices = useAsync(() => getTicketPrices(), []);

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
      {prices.loading && !prices.data ? <Loading /> : null}
      <ErrorBox error={prices.error} onRetry={prices.reload} />
      {(prices.data ?? []).map((g) => (
        <Card key={g.type} style={{ gap: 8 }}>
          <T bold>{g.type}</T>
          {g.prices.map((p) => (
            <View key={p.name} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T dim size={14}>
                {p.name}
              </T>
              <T bold size={14}>
                {p.price}
              </T>
            </View>
          ))}
        </Card>
      ))}
      <T dim size={12}>
        Ücretler Metro İstanbul servisinden geliyor. Otobüs ve metrobüs mesafe bazlı ücretleri, aktarma indirimleri için İETT ücret tarifesine bakabilirsin.
      </T>
      <Button
        title="İETT ücret tarifesi"
        color={Brand.blue}
        onPress={() => WebBrowser.openBrowserAsync('https://www.iett.istanbul/icerik/IETT-Toplu-Ulasim-ucret-Tarifesi')}
      />
    </ScrollView>
  );
}
