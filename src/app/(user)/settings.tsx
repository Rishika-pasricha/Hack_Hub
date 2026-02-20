import { useState } from "react";
import {
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { TextField } from "../../components/ui/TextField";
import { colors, spacing, typography } from "../../constants/theme";
import { getMunicipalityByDistrict, submitBlog, submitIssue } from "../../services/community";
import { MunicipalityInfo } from "../../types/community";
import { useAuth } from "../../context/AuthContext";

type Coordinates = { latitude: number; longitude: number };

function getCurrentPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation || !navigator.geolocation.getCurrentPosition) {
      reject(new Error("Location service not available on this device"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }),
      (error) => reject(new Error(error.message)),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  });
}

export default function SettingsTab() {
  const router = useRouter();
  const { user, fullName, logout } = useAuth();
  const [municipality, setMunicipality] = useState<MunicipalityInfo | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [issueMessage, setIssueMessage] = useState<string | null>(null);
  const [blogMessage, setBlogMessage] = useState<string | null>(null);
  const [districtInput, setDistrictInput] = useState("");

  const [issueForm, setIssueForm] = useState({
    subject: "",
    description: ""
  });

  const [blogForm, setBlogForm] = useState({
    title: "",
    content: ""
  });

  const resolveMunicipalityByLocation = async () => {
    setLocationMessage(null);
    setWorking(true);

    try {
      if (Platform.OS === "android") {
        const permission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
          setLocationMessage("Location permission denied");
          return;
        }
      }

      const { latitude, longitude } = await getCurrentPosition();

      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
      );
      const geoData = await geoRes.json();
      const address = geoData?.address || {};
      const districtCandidate =
        address.state_district || address.county || address.city_district || address.city || address.state;

      if (!districtCandidate) {
        setLocationMessage("Could not detect district from your location");
        return;
      }

      const result = await getMunicipalityByDistrict(String(districtCandidate));
      setMunicipality(result);
      setLocationMessage(`Municipality mapped from location: ${result.municipalityName}`);
    } catch (err: any) {
      setLocationMessage(
        `${err.message || "Failed to fetch municipality from location"}. Use district input below as fallback.`
      );
    } finally {
      setWorking(false);
    }
  };

  const resolveMunicipalityByDistrictInput = async () => {
    setLocationMessage(null);
    if (!districtInput.trim()) {
      setLocationMessage("Enter district/city to find your municipality");
      return;
    }

    try {
      setWorking(true);
      const result = await getMunicipalityByDistrict(districtInput.trim());
      setMunicipality(result);
      setLocationMessage(`Municipality mapped from district input: ${result.municipalityName}`);
    } catch (err: any) {
      setLocationMessage(err.message || "Failed to map municipality from district input");
    } finally {
      setWorking(false);
    }
  };

  const handleIssueSubmit = async () => {
    setIssueMessage(null);
    if (!user) {
      setIssueMessage("Please login first");
      router.replace("/login");
      return;
    }

    if (!municipality?.contactEmail) {
      setIssueMessage("Please detect your municipality in Settings first");
      return;
    }

    if (!fullName || !user.email || !issueForm.subject || !issueForm.description) {
      setIssueMessage("Fill all issue form fields");
      return;
    }

    try {
      await submitIssue({
        userName: fullName,
        userEmail: user.email.toLowerCase(),
        subject: issueForm.subject,
        description: issueForm.description,
        municipalityEmail: municipality.contactEmail
      });
      setIssueMessage("Issue submitted to municipality");
      setIssueForm({ subject: "", description: "" });
    } catch (err: any) {
      setIssueMessage(err.message || "Failed to submit issue");
    }
  };

  const handleBlogSubmit = async () => {
    setBlogMessage(null);
    if (!user) {
      setBlogMessage("Please login first");
      router.replace("/login");
      return;
    }

    if (!municipality?.contactEmail) {
      setBlogMessage("Please detect your municipality in Settings first");
      return;
    }

    if (!fullName || !user.email || !blogForm.title || !blogForm.content) {
      setBlogMessage("Fill all blog form fields");
      return;
    }

    try {
      await submitBlog({
        authorName: fullName,
        authorEmail: user.email.toLowerCase(),
        title: blogForm.title,
        content: blogForm.content,
        municipalityEmail: municipality.contactEmail
      });
      setBlogMessage("Blog submitted for municipality approval");
      setBlogForm({ title: "", content: "" });
    } catch (err: any) {
      setBlogMessage(err.message || "Failed to submit blog");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Location-Based Municipality Mapping</Text>
        <Text style={styles.hint}>Only Settings uses location. Other tabs do not need location access.</Text>
        <PrimaryButton
          label={working ? "Detecting..." : "Use My Location"}
          onPress={resolveMunicipalityByLocation}
          disabled={working}
        />
        <TextField
          label="District / City (fallback)"
          value={districtInput}
          onChangeText={setDistrictInput}
          placeholder="e.g. Gurugram"
        />
        <PrimaryButton
          label={working ? "Searching..." : "Find Municipality By District"}
          onPress={resolveMunicipalityByDistrictInput}
          disabled={working}
        />
        {locationMessage ? <Text style={styles.info}>{locationMessage}</Text> : null}
        {municipality ? (
          <View style={styles.infoBox}>
            <Text style={styles.infoLine}>Municipality: {municipality.municipalityName}</Text>
            <Text style={styles.infoLine}>Type: {municipality.municipalityType}</Text>
            <Text style={styles.infoLine}>District: {municipality.district}</Text>
            <Text style={styles.infoLine}>Email: {municipality.contactEmail}</Text>
            <Text style={styles.infoLine}>Phone: {municipality.contactPhone}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Submit Civic Issue</Text>
        <Text style={styles.hint}>
          Submitting as: {fullName || "Unknown User"} ({user?.email || "No email"})
        </Text>
        <TextField
          label="Subject"
          value={issueForm.subject}
          onChangeText={(value) => setIssueForm((prev) => ({ ...prev, subject: value }))}
        />
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.textArea}
          multiline
          value={issueForm.description}
          onChangeText={(value) => setIssueForm((prev) => ({ ...prev, description: value }))}
          placeholder="Describe the issue in detail"
          placeholderTextColor={colors.muted}
        />
        {issueMessage ? <Text style={styles.info}>{issueMessage}</Text> : null}
        <PrimaryButton label="Submit Issue" onPress={handleIssueSubmit} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Submit Blog / Article</Text>
        <Text style={styles.hint}>This goes to your municipality dashboard for approval first.</Text>
        <Text style={styles.hint}>
          Author: {fullName || "Unknown User"} ({user?.email || "No email"})
        </Text>
        <TextField
          label="Title"
          value={blogForm.title}
          onChangeText={(value) => setBlogForm((prev) => ({ ...prev, title: value }))}
        />
        <Text style={styles.label}>Content</Text>
        <TextInput
          style={styles.textArea}
          multiline
          value={blogForm.content}
          onChangeText={(value) => setBlogForm((prev) => ({ ...prev, content: value }))}
          placeholder="Write your blog/article"
          placeholderTextColor={colors.muted}
        />
        {blogMessage ? <Text style={styles.info}>{blogMessage}</Text> : null}
        <PrimaryButton label="Submit Blog For Approval" onPress={handleBlogSubmit} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <PrimaryButton
          label="Logout"
          onPress={() => {
            logout();
            router.replace("/login");
          }}
        />
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: "700",
    color: colors.text
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.md,
    padding: spacing.lg,
    gap: spacing.sm
  },
  cardTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    color: colors.text
  },
  hint: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs
  },
  info: {
    color: colors.primaryDark,
    fontSize: typography.sizes.sm
  },
  infoBox: {
    backgroundColor: colors.background,
    borderRadius: spacing.sm,
    padding: spacing.md,
    gap: spacing.xs
  },
  infoLine: {
    color: colors.text,
    fontSize: typography.sizes.sm
  },
  label: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    marginTop: spacing.sm
  },
  textArea: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    color: colors.text,
    textAlignVertical: "top"
  }
});
