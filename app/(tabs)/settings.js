import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Linking } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../constants/theme';
import { isLoggedIn, getMe, logout } from '../../services/auth';
import { useRouter } from 'expo-router';

function SettingRow({ icon, title, subtitle, onPress, trailing }) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {trailing || <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const li = await isLoggedIn();
    setLoggedIn(li);
    if (li) {
      const me = await getMe();
      setUser(me);
    }
  }

  const handleLogout = async () => {
    await logout();
    if (global.__ipoPipelineLogout) await global.__ipoPipelineLogout();
    setUser(null);
    setLoggedIn(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚙️ Settings</Text>
      </View>

      {/* Account */}
      <Text style={styles.sectionLabel}>ACCOUNT</Text>
      {loggedIn && user ? (
        <>
          <SettingRow icon="person" title={user.email} subtitle={`Plan: ${user.plan === 'premium' ? 'Premium' : 'Free'}`} />
          {user.plan === 'free' && (
            <SettingRow 
              icon="diamond" 
              title="Upgrade to Premium"
              subtitle="$14.99/mo — Deep analysis, unlimited alerts"
              onPress={() => {}}
            />
          )}
          <SettingRow icon="log-out" title="Sign Out" onPress={handleLogout} />
        </>
      ) : (
        <SettingRow 
          icon="log-in" 
          title="Sign In / Register"
          subtitle="Track watchlist and get personalized alerts"
          onPress={() => router.push('/(tabs)/login')}
        />
      )}

      {/* Notifications */}
      <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
      <SettingRow icon="rocket" title="New S-1 Filings" subtitle="Alert when a new IPO is filed" trailing={<Switch value={true} trackColor={{ true: colors.primary }} />} />
      <SettingRow icon="create" title="Amendments" subtitle="Price range and deal size changes" trailing={<Switch value={true} trackColor={{ true: colors.primary }} />} />
      <SettingRow icon="pricetag" title="IPO Pricing" subtitle="When IPOs are priced" trailing={<Switch value={true} trackColor={{ true: colors.primary }} />} />
      <SettingRow icon="trending-up" title="Listings" subtitle="When IPOs begin trading" trailing={<Switch value={true} trackColor={{ true: colors.primary }} />} />

      {/* About */}
      <Text style={styles.sectionLabel}>ABOUT</Text>
      <SettingRow icon="information-circle" title="About IPO Pipeline" subtitle="v1.0.0" />
      <SettingRow icon="shield-checkmark" title="Privacy Policy" onPress={() => Linking.openURL('https://ipo-pipeline.onrender.com/privacy')} />
      <SettingRow icon="document-text" title="Terms of Service" onPress={() => Linking.openURL('https://ipo-pipeline.onrender.com/terms')} />
      <SettingRow icon="mail" title="Contact Support" onPress={() => Linking.openURL('mailto:support@mirzayanllc.com')} />

      {/* Data Sources */}
      <Text style={styles.sectionLabel}>DATA</Text>
      <SettingRow icon="globe" title="SEC EDGAR" subtitle="S-1, S-1/A, F-1, 424B4 filings" onPress={() => Linking.openURL('https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=S-1&dateb=&owner=include&count=40')} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>IPO Pipeline by Mirzayan LLC</Text>
        <Text style={styles.footerText}>Data sourced from SEC EDGAR</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: colors.white },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    letterSpacing: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  settingContent: { flex: 1 },
  settingTitle: { fontSize: 15, color: colors.white, fontWeight: '600' },
  settingSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  footerText: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
});
