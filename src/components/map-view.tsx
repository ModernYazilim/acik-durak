// Leaflet tabanlı harita. API anahtarı gerektirmediği için WebView içinde çalıştırıyoruz.
import { useEffect, useMemo, useRef } from 'react';
import { StyleProp, StyleSheet, useColorScheme, View, ViewStyle } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  color?: string;
  label?: string; // marker üzerinde kısa yazı (hat kodu vb.)
  title?: string; // popup
  size?: number;
  kind?: 'dot' | 'pin' | 'badge';
};

export type MapLine = { coords: [number, number][]; color: string; width?: number; dashed?: boolean };

type Props = {
  markers?: MapMarker[];
  lines?: MapLine[];
  center?: [number, number];
  zoom?: number;
  fit?: boolean | string; // içerik geldiğinde bir kez sığdır; string verilirse değeri değişince tekrar sığdırır
  user?: { lat: number; lng: number } | null;
  onMarkerPress?: (id: string) => void;
  onMoveEnd?: (c: { lat: number; lng: number; zoom: number }) => void;
  style?: StyleProp<ViewStyle>;
};

const html = (dark: boolean) => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
html,body,#m{margin:0;height:100%;background:${dark ? '#111' : '#eee'}}
.b{font:700 11px -apple-system,Roboto,sans-serif;color:#fff;padding:2px 5px;border-radius:6px;white-space:nowrap;border:1.5px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4);transform:translate(-50%,-50%);display:inline-block}
.d{border-radius:50%;border:1.5px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4);transform:translate(-50%,-50%)}
.u{width:16px;height:16px;border-radius:50%;background:#1a73e8;border:3px solid #fff;box-shadow:0 0 0 6px rgba(26,115,232,.25);transform:translate(-50%,-50%)}
.tiles{${dark ? 'filter:invert(1) hue-rotate(180deg) brightness(.9) contrast(.9);' : ''}}
.leaflet-popup-content{font:13px -apple-system,Roboto,sans-serif}
</style></head><body><div id="m"></div><script>
var map=L.map('m',{zoomControl:false,attributionControl:true,preferCanvas:true}).setView([41.015,28.98],11);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap',className:'tiles'}).addTo(map);
new ResizeObserver(function(){map.invalidateSize(false)}).observe(document.getElementById('m'));
var layer=L.layerGroup().addTo(map),userLayer=L.layerGroup().addTo(map);
function post(o){window.ReactNativeWebView.postMessage(JSON.stringify(o))}
window.onerror=function(m,u,l){post({t:'err',m:String(m)+' @'+l})};
map.on('moveend',function(){var c=map.getCenter();post({t:'move',lat:c.lat,lng:c.lng,zoom:map.getZoom()})});
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
window.setData=function(d){try{
  map.invalidateSize(false);
  layer.clearLayers();var b=[];
  (d.lines||[]).forEach(function(l){var p=L.polyline(l.coords,{color:l.color,weight:l.width||5,opacity:.85,dashArray:l.dashed?'6 6':null}).addTo(layer);b.push(p.getBounds())});
  (d.markers||[]).forEach(function(m){
    var c=m.color||'#e30613',h,s=m.size||12;
    if(m.kind==='badge'||m.label){h='<span class="b" style="background:'+c+'">'+esc(m.label||'')+'</span>'}
    else{h='<div class="d" style="width:'+s+'px;height:'+s+'px;background:'+c+'"></div>'}
    var mk=L.marker([m.lat,m.lng],{icon:L.divIcon({html:h,className:'',iconSize:[0,0]})}).addTo(layer);
    if(m.title)mk.bindPopup(esc(m.title));
    mk.on('click',function(){post({t:'marker',id:m.id})});
    b.push(L.latLngBounds([m.lat,m.lng],[m.lat,m.lng]));
  });
  var ck=d.center?JSON.stringify([d.center,d.zoom]):null;
  if(d.fit&&b.length&&d.fit!==window._fit){window._fit=d.fit;var all=b[0];b.forEach(function(x){all.extend(x)});map.fitBounds(all,{padding:[30,30],maxZoom:16})}
  else if(ck&&ck!==window._ck){map.setView(d.center,d.zoom||map.getZoom())}
  if(ck)window._ck=ck;
}catch(e){post({t:'err',m:'setData '+e.message})}};
window.setUser=function(u){userLayer.clearLayers();if(u)L.marker([u.lat,u.lng],{icon:L.divIcon({html:'<div class="u"></div>',className:'',iconSize:[0,0]})}).addTo(userLayer)};
window.flyTo=function(lat,lng,z){map.flyTo([lat,lng],z||16)};
post({t:'ready'});
</script></body></html>`;

export function MapView({ markers, lines, center, zoom, fit, user, onMarkerPress, onMoveEnd, style }: Props) {
  const dark = useColorScheme() === 'dark';
  const ref = useRef<WebView<object>>(null);
  const ready = useRef(false);
  const source = useMemo(() => ({ html: html(dark), baseUrl: 'https://acikdurak.app/' }), [dark]);

  const payload = JSON.stringify({ markers, lines, center, zoom, fit: fit === true ? 'auto' : fit || null });
  const userPayload = JSON.stringify(user ?? null);

  const push = () => {
    ref.current?.injectJavaScript(`window.setData(${payload});window.setUser(${userPayload});true;`);
  };

  useEffect(() => {
    if (ready.current) push();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, userPayload]);

  const onMessage = (e: WebViewMessageEvent) => {
    const msg = JSON.parse(e.nativeEvent.data);
    if (msg.t === 'ready') {
      ready.current = true;
      push();
    } else if (msg.t === 'marker') onMarkerPress?.(msg.id);
    else if (msg.t === 'move') onMoveEnd?.(msg);
    else if (msg.t === 'err' && __DEV__) console.warn('[map]', msg.m);
  };

  return (
    <View style={[styles.wrap, style]}>
      <WebView<object>
        ref={ref}
        source={source}
        originWhitelist={['*']}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        style={styles.web}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  web: { flex: 1 },
});
