import { ScrollView, View } from 'react-native';

import { Brand, Card, Empty, Row, Separator, T } from '@/components/ui';
import { useAsync } from '@/hooks/use-async';
import { useTheme } from '@/hooks/use-theme';
import { openItem } from '@/lib/nav';
import { cancelReminder, notificationsAllowed } from '@/lib/reminders';
import { useStore } from '@/lib/store';

export default function Reminders() {
  const c = useTheme();
  const { reminders } = useStore();
  const allowed = useAsync(() => notificationsAllowed(), []);
  const active = reminders;

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ paddingBottom: 40 }}>
      <Card style={{ margin: 16, gap: 4 }}>
        <T size={13}>
          Durak, metro ya da vapur ekranında bir seferin yanındaki zile dokunarak hatırlatıcı kurabilirsin. Bildirim telefonda zamanlanır, otobüs
          süreleri tahmin olduğu için birkaç dakika sapabilir.
        </T>
        {allowed.data === false ? (
          <T size={13} color={Brand.red}>
            Bildirim izni kapalı. İlk hatırlatıcıda izin istenir, reddettiysen telefon ayarlarından açmalısın.
          </T>
        ) : null}
      </Card>
      {active.length === 0 ? <Empty text="Aktif hatırlatıcı yok" /> : null}
      {active.map((r) => (
        <View key={r.id}>
          <Row
            onPress={r.target ? () => openItem(r.target!) : undefined}
            title={r.title}
            subtitle={`${new Date(r.at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} · ${r.body}`}
            right={
              <T color={Brand.red} onPress={() => cancelReminder(r.id)} style={{ padding: 6 }}>
                İptal
              </T>
            }
          />
          <Separator />
        </View>
      ))}
    </ScrollView>
  );
}
