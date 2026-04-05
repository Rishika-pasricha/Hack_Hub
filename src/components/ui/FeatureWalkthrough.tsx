import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, radii, spacing, typography } from "../../constants/theme";

type WalkthroughSlide = {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  description: string;
  bullets: string[];
  tint: string;
};

type FeatureWalkthroughProps = {
  visible: boolean;
  userName?: string;
  onComplete: () => void;
};

const { width } = Dimensions.get("window");
const CARD_WIDTH = Math.max(280, Math.min(width - spacing.xl * 2, 560));

export function FeatureWalkthrough({ visible, userName, onComplete }: FeatureWalkthroughProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [sliderWidth, setSliderWidth] = useState(CARD_WIDTH);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView | null>(null);

  const slides = useMemo<WalkthroughSlide[]>(
    () => [
      {
        id: "welcome",
        icon: "leaf-outline",
        title: `Welcome${userName ? `, ${userName}` : ""}`,
        description: "Ecofy is your daily guide for waste segregation, civic reporting, and reuse-first community action.",
        bullets: ["Quick 30-second tour", "Learn what each tab does for segregation and sustainability", "Complete the tour to jump straight into the app"],
        tint: "#0f6d59"
      },
      {
        id: "home",
        icon: "newspaper-outline",
        title: "Home Feed",
        description: "The Home feed spreads awareness about waste management and practical segregation habits from your community.",
        bullets: ["Read posts on biodegradable, non-biodegradable, e-waste, and reusable streams", "Learn local tips and segregation do's and don'ts", "Follow updates and engage to spread awareness"],
        tint: "#2c7a5a"
      },
      {
        id: "segregation-guide",
        icon: "albums-outline",
        title: "Segregation Basics",
        description: "Use Ecofy as a quick mental checklist before disposal so less waste goes to landfill.",
        bullets: ["Biodegradable waste: food scraps and organic material", "Non-biodegradable waste: plastics, metals, glass, and packaging", "Special streams: e-waste, sanitary and hazardous waste"],
        tint: "#3d8159"
      },
      {
        id: "camera",
        icon: "camera-outline",
        title: "Camera Scanner",
        description: "Point your camera at an item to get real-time classification support and reduce wrong-bin disposal.",
        bullets: ["Live scan mode with confidence score", "Use results to decide bin category before you throw", "Pause/resume whenever needed"],
        tint: "#1e7a86"
      },
      {
        id: "shop",
        icon: "cart-outline",
        title: "Best Out Of Waste Shop",
        description: "Marketplace is dedicated to best-out-of-waste and reusable products that extend item life cycles.",
        bullets: ["Buy upcycled products instead of single-use alternatives", "Use Menu for Upload Product and My Products", "Support local creators building from reusable materials"],
        tint: "#9a6b2f"
      },
      {
        id: "civic-hub",
        icon: "people-outline",
        title: "Civic Hub",
        description: "Coordinate with your municipality and contribute local awareness through issues and educational blog submissions.",
        bullets: ["See your mapped municipality details", "Go to My Issues to submit or resolve waste-related reports", "Write blogs/articles to educate people on segregation"],
        tint: "#6d5c9e"
      }
    ],
    [userName]
  );

  const totalSlides = slides.length;
  const isLastSlide = activeIndex === totalSlides - 1;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2400,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 2400,
          useNativeDriver: true
        })
      ])
    );

    if (visible) {
      loop.start();
    }

    return () => {
      loop.stop();
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
    };
  }, [pulseAnim, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    scrollRef.current?.scrollTo({ x: activeIndex * sliderWidth, animated: false });
  }, [activeIndex, sliderWidth, visible]);

  const handleSkip = () => {
    setActiveIndex(0);
    onComplete();
  };

  const handleNext = () => {
    if (isLastSlide) {
      handleSkip();
      return;
    }

    const nextIndex = activeIndex + 1;
    setActiveIndex(nextIndex);
    scrollRef.current?.scrollTo({ x: nextIndex * sliderWidth, animated: true });
  };

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / sliderWidth);
    setActiveIndex(Math.max(0, Math.min(nextIndex, totalSlides - 1)));
  };

  const activeTint = slides[activeIndex]?.tint || colors.primary;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleSkip}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.backgroundOrb,
            {
              backgroundColor: activeTint,
              transform: [
                {
                  scale: pulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1.1]
                  })
                }
              ]
            }
          ]}
        />

        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Quick Tour</Text>
            <Pressable onPress={handleSkip} hitSlop={10}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          </View>

          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            style={styles.slider}
            onLayout={(event) => {
              const measuredWidth = event.nativeEvent.layout.width;
              if (measuredWidth > 0 && measuredWidth !== sliderWidth) {
                setSliderWidth(measuredWidth);
              }
            }}
            onMomentumScrollEnd={handleMomentumEnd}
            contentContainerStyle={styles.sliderContent}
          >
            {slides.map((slide) => (
              <View key={slide.id} style={[styles.slideCard, { width: sliderWidth }]}>
                <View style={[styles.iconWrap, { backgroundColor: slide.tint }]}>
                  <Ionicons name={slide.icon} color="#FFFFFF" size={24} />
                </View>

                <Text style={styles.slideTitle}>{slide.title}</Text>
                <Text style={styles.slideDescription}>{slide.description}</Text>

                <View style={styles.bulletStack}>
                  {slide.bullets.map((bullet) => (
                    <View key={bullet} style={styles.bulletRow}>
                      <View style={[styles.dot, { backgroundColor: slide.tint }]} />
                      <Text style={styles.bulletText}>{bullet}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.pagination}>
              {slides.map((slide, index) => (
                <View
                  key={slide.id}
                  style={[
                    styles.pageDot,
                    index === activeIndex ? { width: 22, backgroundColor: activeTint } : null
                  ]}
                />
              ))}
            </View>

            <Pressable style={[styles.ctaButton, { backgroundColor: activeTint }]} onPress={handleNext}>
              <Text style={styles.ctaText}>{isLastSlide ? "Start Using Ecofy" : "Next"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(14, 23, 20, 0.58)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg
  },
  backgroundOrb: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: 180,
    opacity: 0.32,
    top: 60,
    right: -90
  },
  sheet: {
    width: "100%",
    maxWidth: 620,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "700",
    color: colors.text
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: "600"
  },
  sliderContent: {
    alignItems: "stretch"
  },
  slider: {
    width: "100%"
  },
  slideCard: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    backgroundColor: "#FBF9F4",
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center"
  },
  slideTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: "700",
    color: colors.text
  },
  slideDescription: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 21
  },
  bulletStack: {
    marginTop: spacing.sm,
    gap: spacing.sm
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6
  },
  bulletText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.text
  },
  footer: {
    gap: spacing.md
  },
  pagination: {
    flexDirection: "row",
    alignSelf: "center",
    gap: spacing.xs
  },
  pageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D7CEC3"
  },
  ctaButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: radii.md
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: typography.sizes.md,
    fontWeight: "700"
  }
});
