import { StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { colors, spacing, typography } from "../constants/theme";
import { PrimaryButton } from "../components/ui/PrimaryButton";

export default function Home() {
    return (
        <View style={styles.container}>
            <View style={styles.hero}>
                <Text style={styles.title}>Ecofy</Text>
                <Text style={styles.subtitle}>
                    Create an account to start your eco journey with personal insights.
                </Text>
            </View>
            <Link href="/register" asChild>
                <PrimaryButton label="Register" onPress={() => undefined} />
            </Link>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        padding: spacing.xl,
        justifyContent: "center"
    },
    hero: {
        marginBottom: spacing.xxl
    },
    title: {
        fontSize: typography.title,
        fontWeight: "700",
        color: colors.text,
        marginBottom: spacing.sm
    },
    subtitle: {
        fontSize: typography.subtitle,
        color: colors.muted
    }
});