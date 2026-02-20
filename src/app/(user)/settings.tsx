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
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { TextField } from "../../components/ui/TextField";
import { colors, spacing, typography } from "../../constants/theme";
import { getMunicipalityByDistrict, submitBlog, submitIssue } from "../../services/community";
import { MunicipalityInfo } from "../../types/community";

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
  const [municipality, setMunicipality] = useState<MunicipalityInfo | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [issueMessage, setIssueMessage] = useState<string | null>(null);
  const [blogMessage, setBlogMessage] = useState<string | null>(null);

  const [issueForm, setIssueForm] = useState({
    userName: "",
    userEmail: "",
    subject: "",
    description: ""
  });

  const [blogForm, setBlogForm] = useState({
    authorName: "",
    authorEmail: "",
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
      setLocationMessage(err.message || "Failed to fetch municipality from location");
    } finally {
      setWorking(false);
    }
  };

  const handleIssueSubmit = async () => {
    setIssueMessage(null);

    if (!municipality?.contactEmail) {
      setIssueMessage("Please detect your municipality in Settings first");
      return;
    }

    if (!issueForm.userName || !issueForm.userEmail || !issueForm.subject || !issueForm.description) {
      setIssueMessage("Fill all issue form fields");
      return;
    }

    try {
      await submitIssue({
        userName: issueForm.userName,
        userEmail: issueForm.userEmail.toLowerCase(),
        subject: issueForm.subject,
        description: issueForm.description,
        municipalityEmail: municipality.contactEmail
      });
      setIssueMessage("Issue submitted to municipality");
      setIssueForm({ userName: "", userEmail: "", subject: "", description: "" });
    } catch (err: any) {
      setIssueMessage(err.message || "Failed to submit issue");
    }
  };

  const handleBlogSubmit = async () => {
    setBlogMessage(null);

    if (!municipality?.contactEmail) {
      setBlogMessage("Please detect your municipality in Settings first");
      return;
    }

    if (!blogForm.authorName || !blogForm.authorEmail || !blogForm.title || !blogForm.content) {
      setBlogMessage("Fill all blog form fields");
      return;
    }

    try {
      await submitBlog({
        authorName: blogForm.authorName,
        authorEmail: blogForm.authorEmail.toLowerCase(),
        title: blogForm.title,
        content: blogForm.content,
        municipalityEmail: municipality.contactEmail
      });
      setBlogMessage("Blog submitted for municipality approval");
      setBlogForm({ authorName: "", authorEmail: "", title: "", content: "" });
    } catch (err: any) {
      setBlogMessage(err.message || "Failed to submit blog");
    }
  };

  return (
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
        <TextField
          label="Your Name"
          value={issueForm.userName}
          onChangeText={(value) => setIssueForm((prev) => ({ ...prev, userName: value }))}
        />
        <TextField
          label="Your Email"
          value={issueForm.userEmail}
          onChangeText={(value) => setIssueForm((prev) => ({ ...prev, userEmail: value }))}
          keyboardType="email-address"
        />
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
        <TextField
          label="Author Name"
          value={blogForm.authorName}
          onChangeText={(value) => setBlogForm((prev) => ({ ...prev, authorName: value }))}
        />
        <TextField
          label="Author Email"
          value={blogForm.authorEmail}
          onChangeText={(value) => setBlogForm((prev) => ({ ...prev, authorEmail: value }))}
          keyboardType="email-address"
        />
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
        <PrimaryButton label="Logout" onPress={() => router.replace("/login")} />
      </View>
    </ScrollView>
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
