import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/theme/colors';

type Section = {
  key: string;
  title: string;
  icon: string;
  color: string;
  steps: { heading: string; detail: string }[];
};

const GUIDE_SECTIONS: Section[] = [
  {
    key: 'fleet',
    title: 'Fleet Dashboard',
    icon: 'map-outline',
    color: Colors.primary,
    steps: [
      {
        heading: 'View all drivers',
        detail: 'The Fleet tab shows every active driver with their duty status (Off Duty, Sleeper, Driving, On Duty). Tap any driver card to see real-time location, speed, and fuel level.',
      },
      {
        heading: 'Fuel reserve alerts',
        detail: 'Drivers with estimated range under 100 miles are flagged automatically. Range is calculated from average MPG and current fuel level reported by the truck ECU.',
      },
      {
        heading: 'HOS status',
        detail: 'Hours-of-service bars show remaining drive time and window time. A driver highlighted in amber is within 1 hour of their limit; red means they must stop now.',
      },
    ],
  },
  {
    key: 'loads',
    title: 'Load Management',
    icon: 'cube-outline',
    color: Colors.accent,
    steps: [
      {
        heading: 'Assign a load',
        detail: 'Open the Loads tab and tap "New Load." Enter origin, destination, commodity, and weight. Select an available driver — only HOS-eligible drivers appear in the list.',
      },
      {
        heading: 'Track delivery status',
        detail: 'Each load moves through: Available → Assigned → In Transit → Delivered → Completed. Drivers update status via the My Load screen or Voice AI.',
      },
      {
        heading: 'Customer notifications',
        detail: 'When a driver uses the "Notify Customer ETA" voice command or the AI triggers it automatically, a log entry appears in the Comms tab. Confirm deliveries and review customer responses there.',
      },
    ],
  },
  {
    key: 'maintenance',
    title: 'Maintenance Dashboard',
    icon: 'construct-outline',
    color: Colors.statusAmber,
    steps: [
      {
        heading: 'Reading the dashboard',
        detail: 'The Maintenance tab shows summary badges: Overdue (red), Due Soon (amber), Urgent reports (red), and Open reports (amber). Scroll down for vehicle-by-vehicle detail.',
      },
      {
        heading: 'Schedule alerts',
        detail: 'Items flagged Overdue are past their mileage or date threshold. Due Soon means they are within 500 miles or 14 days of the service interval. Address these before dispatch.',
      },
      {
        heading: 'Driver-submitted reports',
        detail: 'When a driver reports an issue from the Truck tab (with photos and urgency level), it appears here immediately. Urgent reports trigger a dispatch message to all online dispatchers.',
      },
      {
        heading: 'Adding vehicles',
        detail: 'Use the backend admin or API to add vehicles and set maintenance schedules for oil, tires, brakes, and DOT inspections. The dashboard pulls from these records automatically.',
      },
    ],
  },
  {
    key: 'comms',
    title: 'Communications Log',
    icon: 'megaphone-outline',
    color: Colors.primary,
    steps: [
      {
        heading: 'What appears here',
        detail: 'Every customer notification sent by a driver or the AI system is logged: ETA updates, delivery confirmations, delay notices. Filter by driver using the chips at the top.',
      },
      {
        heading: 'Customer responses',
        detail: 'If a customer replies via email or SMS (requires SendGrid / Twilio keys in settings), their response appears inside the communication card. Tap "Log Response" to record manual responses.',
      },
      {
        heading: 'Communication channels',
        detail: 'Channels depend on what contact info is on file for the load destination: Email, SMS, or In-App. Configure SendGrid and Twilio API keys in the backend environment to enable email and SMS.',
      },
    ],
  },
  {
    key: 'health',
    title: 'Driver Health Alerts',
    icon: 'heart-outline',
    color: Colors.statusRed,
    steps: [
      {
        heading: 'Fatigue score',
        detail: 'Drivers who consent to health monitoring share a fatigue score (0–10) derived from Apple Watch data: heart rate variability, resting HR, sleep duration, and SpO₂. Scores ≥7 trigger a safety alert.',
      },
      {
        heading: 'Dispatcher visibility',
        detail: 'You only see a driver\'s fatigue score if they\'ve explicitly enabled "Share fatigue score with dispatcher" in their Health tab. Individual metrics (HR, sleep hours) are never visible to dispatchers.',
      },
      {
        heading: 'What to do with alerts',
        detail: 'If a driver\'s fatigue score is high, contact them via the Messages tab before their next dispatch. Consider reassigning or delaying the load. Document the decision for liability purposes.',
      },
    ],
  },
  {
    key: 'drivers',
    title: 'Adding Drivers & Staff',
    icon: 'people-outline',
    color: Colors.accent,
    steps: [
      {
        heading: 'Register a new driver',
        detail: 'Drivers self-register using the mobile app. They select "Driver" as their role and enter your company\'s registration code (set in Company Settings). Their account is linked to your company automatically.',
      },
      {
        heading: 'Add a dispatcher',
        detail: 'Dispatchers are added by a Company Admin via the API or admin panel. Only Company Admins can create dispatcher accounts — this prevents unauthorized role escalation.',
      },
      {
        heading: 'Driver onboarding checklist',
        detail: 'Each driver has a setup checklist: CDL profile, voice safety acknowledgement, personal Anthropic AI key, health consent, and required documents upload. Track completion from the backend admin.',
      },
    ],
  },
  {
    key: 'voice',
    title: 'Voice AI for Dispatchers',
    icon: 'mic-outline',
    color: Colors.textSecondary,
    steps: [
      {
        heading: 'Driver voice commands',
        detail: 'Drivers can speak commands hands-free: get their current load, update delivery status, check HOS remaining, report maintenance issues, and notify customers with ETA updates.',
      },
      {
        heading: 'Personal AI keys',
        detail: 'Each driver can add their own Anthropic API key in Setup → Add My API Key. This charges AI usage to their personal account. If no key is set, the company system key is used.',
      },
      {
        heading: 'Voice is optional',
        detail: 'Voice AI is strongly recommended for road safety (hands-free operation) but not required. Drivers who have not acknowledged the safety guidelines will have voice blocked until they complete that step.',
      },
    ],
  },
];

export default function DispatcherGuideScreen() {
  const [expanded, setExpanded] = useState<string | null>('fleet');

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Dispatcher Guide</Text>
          <Text style={styles.subtitle}>Setup & feature reference</Text>
        </View>
        <Ionicons name="book-outline" size={24} color={Colors.textMuted} />
      </View>

      <View style={styles.intro}>
        <Ionicons name="information-circle-outline" size={18} color={Colors.accent} />
        <Text style={styles.introText}>
          Tap any section to expand the setup and usage guide for that feature.
        </Text>
      </View>

      <View style={styles.sections}>
        {GUIDE_SECTIONS.map(section => {
          const isOpen = expanded === section.key;
          return (
            <View key={section.key} style={styles.card}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => setExpanded(isOpen ? null : section.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconBox, { backgroundColor: section.color + '22' }]}>
                  <Ionicons name={section.icon as any} size={20} color={section.color} />
                </View>
                <Text style={styles.cardTitle}>{section.title}</Text>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.cardBody}>
                  {section.steps.map((step, i) => (
                    <View
                      key={i}
                      style={[styles.step, i > 0 && { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 }]}
                    >
                      <View style={styles.stepDot}>
                        <Text style={styles.stepNum}>{i + 1}</Text>
                      </View>
                      <View style={styles.stepText}>
                        <Text style={styles.stepHeading}>{step.heading}</Text>
                        <Text style={styles.stepDetail}>{step.detail}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Ionicons name="shield-checkmark-outline" size={16} color={Colors.textMuted} />
        <Text style={styles.footerText}>
          TruckerAI uses end-to-end encryption for driver API keys. Health data is never stored without explicit driver consent.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
  },
  title: { color: Colors.textPrimary, fontSize: 22, fontWeight: '700' },
  subtitle: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  intro: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: Colors.accent + '15', borderRadius: 12,
    marginHorizontal: 16, marginBottom: 12, padding: 12,
    borderWidth: 1, borderColor: Colors.accent + '33',
  },
  introText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19, flex: 1 },
  sections: { marginHorizontal: 16, gap: 10 },
  card: {
    backgroundColor: Colors.bgCard, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
  },
  iconBox: {
    width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  cardTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600', flex: 1 },
  cardBody: {
    borderTopWidth: 1, borderTopColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 14, gap: 12,
  },
  step: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  stepDot: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary + '33',
    justifyContent: 'center', alignItems: 'center', marginTop: 1, flexShrink: 0,
  },
  stepNum: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  stepText: { flex: 1 },
  stepHeading: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  stepDetail: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19 },
  footer: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    marginHorizontal: 16, marginTop: 16, padding: 12,
    backgroundColor: Colors.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  footerText: { color: Colors.textMuted, fontSize: 12, lineHeight: 18, flex: 1 },
});