import { useEffect, useState, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View, ActivityIndicator, Platform, useWindowDimensions } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing } from '../theme';

function buildWeatherUrlByCity() {
  const apiKey = String(process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY || '').trim();
  const city = String(process.env.EXPO_PUBLIC_WEATHER_CITY || '').trim();
  const country = String(process.env.EXPO_PUBLIC_WEATHER_COUNTRY || '').trim();

  console.log('[Weather] Config check:', {
    keyLength: apiKey.length,
    keyStart: apiKey.substring(0, 4) + '...',
    city,
    country,
  });

  if (!apiKey || !city) return '';
  const query = country ? `${city},${country}` : city;
  return `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&appid=${encodeURIComponent(apiKey)}&units=metric`;
}

export default function WorkspaceHeaderCard({ label, smallWeather = false }) {
  const [weather, setWeather] = useState({ temp: null, city: '', loading: false });
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const expandedOnWeb = isWeb && width > 600;
  const cardMinWidth = smallWeather ? 120 : expandedOnWeb ? 200 : 150;

  const loadWeather = useCallback(() => {
    const url = buildWeatherUrlByCity();
    console.log('[Weather] API URL:', url.replace(/appid=[^&]+/, 'appid=***'));
    if (!url) return;

    setWeather(w => ({ ...w, loading: true }));
    fetch(url)
      .then(r => r.json())
      .then(data => {
        console.log('[Weather] Response:', data);
        if (data?.main?.temp) {
          setWeather({
            temp: Math.round(data.main.temp),
            city: data.name || '',
            loading: false,
          });
        } else if (data?.cod === 401) {
          console.error('[Weather] Invalid API key');
          setWeather({ temp: null, city: '', loading: false });
        } else {
          setWeather({ temp: null, city: '', loading: false });
        }
      })
      .catch(err => {
        console.error('[Weather] Fetch error:', err);
        setWeather({ temp: null, city: '', loading: false });
      });
  }, []);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  return (
    <Pressable onPress={loadWeather} style={styles.touchArea}>
      <LinearGradient
        colors={[colors.sky500, colors.primary]}
        start={[0, 0]}
        end={[1, 1]}
        style={[
          styles.weatherCard,
          smallWeather ? styles.weatherCardSmall : null,
          expandedOnWeb ? styles.weatherCardLarge : null,
          { minWidth: cardMinWidth },
        ]}
      >
        <View style={[
          styles.iconWrap,
          smallWeather ? styles.iconWrapSmall : null,
          expandedOnWeb ? styles.iconWrapLarge : null,
        ]}>
          <FontAwesome5 name="cloud-sun" size={smallWeather ? 14 : expandedOnWeb ? 22 : 18} color="#fff" solid />
        </View>

        <View style={styles.textWrap}>
          {weather.loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#fff" />
              {!smallWeather && <Text style={styles.loadingText}>Updating</Text>}
            </View>
          ) : (
            <Text style={[styles.tempText, smallWeather ? styles.tempTextSmall : null, expandedOnWeb ? styles.tempTextLarge : null]}>
              {weather.temp !== null ? `${weather.temp}°C` : '--'}
            </Text>
          )}
          <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.cityText, smallWeather ? styles.cityTextSmall : null]}>
            {weather.city || '—'}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  weather: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  weatherText: {
    color: colors.ink600,
    fontSize: 11,
    fontWeight: '500',
  },
  touchArea: {
    padding: 2,
  },
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  weatherCardSmall: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  weatherCardLarge: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconWrapSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  iconWrapLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  textWrap: {
    flexDirection: 'column',
  },
  tempText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  tempTextSmall: {
    fontSize: 14,
  },
  tempTextLarge: {
    fontSize: 20,
  },
  cityText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loadingText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 12,
  },
});
