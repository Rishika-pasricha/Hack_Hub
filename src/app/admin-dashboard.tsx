import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { VideoView, useVideoPlayer } from "expo-video";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { colors, spacing, typography } from "../constants/theme";
import {
  approveBlogForAdmin,
  getIssuesForAdmin,
  getMunicipalityActivityMetrics,
  getPendingBlogsForAdmin,
  notifyIssueCompletion
} from "../services/community";
import { BlogPost, Issue } from "../types/community";
import { useAuth } from "../context/AuthContext";

type DashboardTab = "analytics" | "issues" | "content";

type MunicipalityAnalytics = {
  municipalityName: string;
  district: string;
  totalIssues: number;
  resolvedIssues: number;
  openIssues: number;
  resolvedThisMonth: number;
  avgResolutionTime: number;
  activeCitizensCount: number;
  approvedBlogsThisMonth: number;
  blogsSubmittedThisMonth: number;
  productsListedThisMonth: number;
  issuesSubmittedThisMonth: number;
  repeatReporterRate: number;
  avgIssuesPerCitizen: number;
  issueMediaAdoptionRate: number;
  videoEvidenceRate: number;
  peakReportingHour: number;
  peakReportingDay: string;
  weekOverWeekIssueTrend: number;
  weeklyIssueTrend: Array<{
    date: string;
    count: number;
  }>;
  issueWeekdayDistribution: Array<{
    day: string;
    count: number;
  }>;
  topIssueContributors: Array<{
    userEmail: string;
    userName: string;
    issueCount: number;
    lastSubmittedAt: string;
  }>;
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));
const toHourLabel = (hour: number) => {
  const safeHour = Number.isFinite(hour) ? Math.max(0, Math.min(23, Math.floor(hour))) : 0;
  const period = safeHour >= 12 ? "PM" : "AM";
  const normalized = safeHour % 12 || 12;
  return `${normalized} ${period}`;
};

type IssueMediaVideoProps = {
  uri: string;
};

type PieSlice = {
  label: string;
  value: number;
  color: string;
};

function IssueMediaVideo({ uri }: IssueMediaVideoProps) {
  const videoViewRef = useRef<VideoView | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const player = useVideoPlayer(uri, (createdPlayer) => {
    createdPlayer.loop = false;
  });

  useEffect(() => {
    const subscription = player.addListener("playingChange", (payload) => {
      setIsPlaying(payload.isPlaying);
    });
    return () => {
      subscription.remove();
    };
  }, [player]);

  const handleTogglePlayback = () => {
    if (player.playing) {
      player.pause();
      return;
    }
    player.play();
  };

  const handleFullscreen = async () => {
    try {
      await videoViewRef.current?.enterFullscreen();
    } catch {
      // Ignore fullscreen errors on unsupported environments.
    }
  };

  return (
    <View style={styles.mediaVideoWrap}>
      <VideoView ref={videoViewRef} player={player} style={styles.mediaVideo} contentFit="cover" nativeControls={false} />
      <TouchableOpacity style={styles.mediaVideoOverlay} onPress={handleTogglePlayback}>
        <Text style={styles.mediaVideoOverlayText}>{isPlaying ? "Pause" : "Play"}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.mediaVideoFullscreen} onPress={handleFullscreen}>
        <Text style={styles.mediaVideoFullscreenText}>⛶</Text>
      </TouchableOpacity>
    </View>
  );
}

function DonutChart({ slices }: { slices: PieSlice[] }) {
  const safeSlices = slices.filter((slice) => slice.value > 0);
  const total = safeSlices.reduce((sum, slice) => sum + slice.value, 0);
  const size = 160;

  if (total <= 0) {
    return <Text style={styles.chartMeta}>No data available for pie chart.</Text>;
  }

  const primarySlice = safeSlices[0] || { label: "", value: 0, color: colors.primary };
  const secondarySlice = safeSlices[1] || { label: "", value: 0, color: colors.warning };
  const primaryPercent = clampPercent((primarySlice.value / total) * 100);

  return (
    <View style={styles.donutWrap}>
      <View style={[styles.pieTrack, { width: size, height: size, borderRadius: size / 2, backgroundColor: secondarySlice.color }]}>
        <View style={styles.pieFillWrap}>
          <View style={[styles.pieFill, { width: `${primaryPercent}%`, backgroundColor: primarySlice.color }]} />
        </View>
      </View>
      <View style={styles.donutCenter}>
        <Text style={styles.donutValue}>{total}</Text>
        <Text style={styles.donutLabel}>issues</Text>
      </View>
    </View>
  );
}

function ScatterPlot({ values }: { values: number[] }) {
  const width = 300;
  const height = 160;
  const padding = 14;
  const maxValue = Math.max(...values, 1);
  const pointCount = values.length;

  if (pointCount === 0) {
    return <Text style={styles.chartMeta}>No data available for scatter plot.</Text>;
  }

  const toX = (index: number) => {
    if (pointCount === 1) {
      return width / 2;
    }
    return padding + (index / (pointCount - 1)) * (width - padding * 2);
  };

  const toY = (value: number) => {
    const ratio = value / maxValue;
    return height - padding - ratio * (height - padding * 2);
  };

  return (
    <View style={styles.scatterWrap}>
      <View style={[styles.scatterCanvas, { width, height }]}>
        <View style={[styles.scatterAxisX, { left: padding, right: padding, bottom: padding }]} />
        <View style={[styles.scatterAxisY, { top: padding, bottom: padding, left: padding }]} />
        {values.map((value, index) => (
          <View
            key={`scatter-point-${index}`}
            style={[
              styles.scatterDot,
              {
                left: toX(index) - 4,
                top: toY(value) - 4
              }
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, logout, isHydrated } = useAuth();
  const municipalityEmail = user?.email || "";
  const [pendingBlogs, setPendingBlogs] = useState<BlogPost[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [analytics, setAnalytics] = useState<MunicipalityAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [processingIssueId, setProcessingIssueId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>("analytics");
  const weeklyIssueTrend = analytics?.weeklyIssueTrend || [];
  const issueWeekdayDistribution = analytics?.issueWeekdayDistribution || [];
  const topIssueContributors = analytics?.topIssueContributors || [];

  const resolutionRate = analytics
    ? clampPercent((analytics.resolvedIssues / Math.max(analytics.totalIssues, 1)) * 100)
    : 0;
  const openIssuePressure = analytics
    ? clampPercent((analytics.openIssues / Math.max(analytics.totalIssues, 1)) * 100)
    : 0;
  const citizenEngagementRate = analytics
    ? clampPercent((analytics.activeCitizensCount / Math.max(analytics.totalIssues, 1)) * 100)
    : 0;
  const monthlyActivityMax = analytics
    ? Math.max(
        analytics.issuesSubmittedThisMonth,
        analytics.resolvedThisMonth,
        analytics.blogsSubmittedThisMonth,
        analytics.approvedBlogsThisMonth,
        analytics.productsListedThisMonth,
        1
      )
    : 1;
  const weeklyTrendMax = analytics
    ? Math.max(...weeklyIssueTrend.map((entry) => entry.count), 1)
    : 1;
  const weekdayDistributionMax = analytics
    ? Math.max(...issueWeekdayDistribution.map((entry) => entry.count), 1)
    : 1;

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const loadData = async () => {
    if (!municipalityEmail.trim()) {
      setMessage("Enter municipality email to load dashboard data");
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      const [blogs, issueList, analyticsData] = await Promise.all([
        getPendingBlogsForAdmin(municipalityEmail.trim().toLowerCase()),
        getIssuesForAdmin(municipalityEmail.trim().toLowerCase()),
        getMunicipalityActivityMetrics(municipalityEmail.trim().toLowerCase())
      ]);
      setPendingBlogs(blogs);
      setIssues(issueList);
      setAnalytics({
        ...analyticsData,
        weeklyIssueTrend: analyticsData?.weeklyIssueTrend || [],
        issueWeekdayDistribution: analyticsData?.issueWeekdayDistribution || [],
        topIssueContributors: analyticsData?.topIssueContributors || []
      });
    } catch (err: any) {
      setMessage(err.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (blogId: string) => {
    try {
      setMessage(null);
      await approveBlogForAdmin(blogId, municipalityEmail.trim().toLowerCase());
      setMessage("Blog approved successfully");
      await loadData();
    } catch (err: any) {
      setMessage(err.message || "Failed to approve blog");
    }
  };

  const handleIssueCompletion = async (issueId: string, adminName: string) => {
    try {
      setMessage(null);
      setProcessingIssueId(issueId);
      await notifyIssueCompletion(issueId, municipalityEmail.trim().toLowerCase(), adminName);
      setMessage("Completion notification sent to issue reporter");
    } catch (err: any) {
      setMessage(err.message || "Failed to send completion notification");
    } finally {
      setProcessingIssueId(null);
    }
  };

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "admin") {
      router.replace("/blogs");
      return;
    }
    loadData();
  }, [user, isHydrated]);

  if (!isHydrated || !user || user.role !== "admin") {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Municipality Admin Dashboard</Text>
        <Text style={styles.subtitle}>Track civic activity, issues, and approval queue</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Municipality Context</Text>
          <Text style={styles.cardMeta}>{municipalityEmail || "No municipality email found in session"}</Text>
          <PrimaryButton label={loading ? "Loading..." : "Refresh Data"} onPress={loadData} disabled={loading} />
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "analytics" && styles.tabButtonActive]}
            onPress={() => setActiveTab("analytics")}
          >
            <Text style={[styles.tabButtonText, activeTab === "analytics" && styles.tabButtonTextActive]}>Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "issues" && styles.tabButtonActive]}
            onPress={() => setActiveTab("issues")}
          >
            <Text style={[styles.tabButtonText, activeTab === "issues" && styles.tabButtonTextActive]}>Issues</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "content" && styles.tabButtonActive]}
            onPress={() => setActiveTab("content")}
          >
            <Text style={[styles.tabButtonText, activeTab === "content" && styles.tabButtonTextActive]}>Content</Text>
          </TouchableOpacity>
        </View>

        {activeTab === "analytics" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Municipality Analytics</Text>
            {analytics ? (
              <View style={styles.analyticsGrid}>
                <View style={styles.analyticsItem}>
                  <Text style={styles.analyticsLabel}>Municipality</Text>
                  <Text style={styles.analyticsValue}>{analytics.municipalityName}</Text>
                </View>
                <View style={styles.analyticsItem}>
                  <Text style={styles.analyticsLabel}>District</Text>
                  <Text style={styles.analyticsValue}>{analytics.district}</Text>
                </View>
                <View style={styles.analyticsStatsRow}>
                  <View style={[styles.analyticsItem, styles.analyticsStatCard]}>
                    <Text style={styles.analyticsLabel}>Total Issues</Text>
                    <Text style={styles.analyticsValue}>{analytics.totalIssues}</Text>
                  </View>
                  <View style={[styles.analyticsItem, styles.analyticsStatCard]}>
                    <Text style={styles.analyticsLabel}>Avg Resolution Time</Text>
                    <Text style={styles.analyticsValue}>{analytics.avgResolutionTime} days</Text>
                  </View>
                </View>

                <View style={styles.chartCard}>
                  <Text style={styles.chartTitle}>User Behavior Indicators</Text>

                  <View style={styles.behaviorRow}>
                    <View style={styles.behaviorRowHeader}>
                      <Text style={styles.analyticsLabel}>Issue Resolution Rate</Text>
                      <Text style={styles.behaviorValue}>{Math.round(resolutionRate)}%</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          styles.progressFillSuccess,
                          { width: `${resolutionRate}%` }
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.behaviorRow}>
                    <View style={styles.behaviorRowHeader}>
                      <Text style={styles.analyticsLabel}>Citizen Engagement Index</Text>
                      <Text style={styles.behaviorValue}>{Math.round(citizenEngagementRate)}%</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          styles.progressFillInfo,
                          { width: `${citizenEngagementRate}%` }
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.behaviorRow}>
                    <View style={styles.behaviorRowHeader}>
                      <Text style={styles.analyticsLabel}>Open Issue Pressure</Text>
                      <Text style={styles.behaviorValue}>{Math.round(openIssuePressure)}%</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          styles.progressFillWarning,
                          { width: `${openIssuePressure}%` }
                        ]}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.chartCard}>
                  <Text style={styles.chartTitle}>Participation Quality</Text>
                  <View style={styles.behaviorRow}>
                    <View style={styles.behaviorRowHeader}>
                      <Text style={styles.analyticsLabel}>Repeat Reporter Rate</Text>
                      <Text style={styles.behaviorValue}>{analytics.repeatReporterRate}%</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          styles.progressFillPrimary,
                          { width: `${clampPercent(analytics.repeatReporterRate)}%` }
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.behaviorRow}>
                    <View style={styles.behaviorRowHeader}>
                      <Text style={styles.analyticsLabel}>Media Evidence Adoption</Text>
                      <Text style={styles.behaviorValue}>{analytics.issueMediaAdoptionRate}%</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          styles.progressFillSuccess,
                          { width: `${clampPercent(analytics.issueMediaAdoptionRate)}%` }
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.behaviorRow}>
                    <View style={styles.behaviorRowHeader}>
                      <Text style={styles.analyticsLabel}>Video Evidence Rate</Text>
                      <Text style={styles.behaviorValue}>{analytics.videoEvidenceRate}%</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          styles.progressFillInfo,
                          { width: `${clampPercent(analytics.videoEvidenceRate)}%` }
                        ]}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.chartCard}>
                  <Text style={styles.chartTitle}>Monthly Activity Mix</Text>

                  <View style={styles.activityRow}>
                    <Text style={styles.activityLabel}>Issues Submitted</Text>
                    <View style={styles.activityTrack}>
                      <View
                        style={[
                          styles.activityBar,
                          styles.activityBarWarning,
                          {
                            width: `${(analytics.issuesSubmittedThisMonth / monthlyActivityMax) * 100}%`
                          }
                        ]}
                      />
                    </View>
                    <Text style={styles.activityValue}>{analytics.issuesSubmittedThisMonth}</Text>
                  </View>

                  <View style={styles.activityRow}>
                    <Text style={styles.activityLabel}>Resolved Issues</Text>
                    <View style={styles.activityTrack}>
                      <View
                        style={[
                          styles.activityBar,
                          styles.activityBarPrimary,
                          {
                            width: `${(analytics.resolvedThisMonth / monthlyActivityMax) * 100}%`
                          }
                        ]}
                      />
                    </View>
                    <Text style={styles.activityValue}>{analytics.resolvedThisMonth}</Text>
                  </View>

                  <View style={styles.activityRow}>
                    <Text style={styles.activityLabel}>Blogs Submitted</Text>
                    <View style={styles.activityTrack}>
                      <View
                        style={[
                          styles.activityBar,
                          styles.activityBarPrimary,
                          {
                            width: `${(analytics.blogsSubmittedThisMonth / monthlyActivityMax) * 100}%`
                          }
                        ]}
                      />
                    </View>
                    <Text style={styles.activityValue}>{analytics.blogsSubmittedThisMonth}</Text>
                  </View>

                  <View style={styles.activityRow}>
                    <Text style={styles.activityLabel}>Approved Blogs</Text>
                    <View style={styles.activityTrack}>
                      <View
                        style={[
                          styles.activityBar,
                          styles.activityBarSuccess,
                          {
                            width: `${(analytics.approvedBlogsThisMonth / monthlyActivityMax) * 100}%`
                          }
                        ]}
                      />
                    </View>
                    <Text style={styles.activityValue}>{analytics.approvedBlogsThisMonth}</Text>
                  </View>

                  <View style={styles.activityRow}>
                    <Text style={styles.activityLabel}>Products Listed</Text>
                    <View style={styles.activityTrack}>
                      <View
                        style={[
                          styles.activityBar,
                          styles.activityBarInfo,
                          {
                            width: `${(analytics.productsListedThisMonth / monthlyActivityMax) * 100}%`
                          }
                        ]}
                      />
                    </View>
                    <Text style={styles.activityValue}>{analytics.productsListedThisMonth}</Text>
                  </View>
                </View>

                <View style={styles.chartCard}>
                  <Text style={styles.chartTitle}>Issue Trend (Last 7 Days)</Text>
                  <Text style={styles.chartMeta}>
                    Week-over-week: {analytics.weekOverWeekIssueTrend > 0 ? "+" : ""}{analytics.weekOverWeekIssueTrend}%
                  </Text>
                  <ScatterPlot values={weeklyIssueTrend.map((entry) => entry.count)} />
                  <View style={styles.weeklyBarsRow}>
                    {weeklyIssueTrend.map((entry) => {
                      const dayLabel = entry.date.slice(5);
                      const barHeight = Math.max(8, (entry.count / weeklyTrendMax) * 80);
                      return (
                        <View key={entry.date} style={styles.weekBarWrap}>
                          <Text style={styles.weekBarValue}>{entry.count}</Text>
                          <View style={styles.weekBarTrack}>
                            <View style={[styles.weekBarFill, { height: barHeight }]} />
                          </View>
                          <Text style={styles.weekBarLabel}>{dayLabel}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.chartCard}>
                  <Text style={styles.chartTitle}>Reporting Pattern</Text>
                  <Text style={styles.chartMeta}>
                    Peak time: {toHourLabel(analytics.peakReportingHour)} | Peak day: {analytics.peakReportingDay}
                  </Text>
                  {issueWeekdayDistribution.map((entry) => (
                    <View key={entry.day} style={styles.activityRow}>
                      <Text style={styles.activityLabel}>{entry.day}</Text>
                      <View style={styles.activityTrack}>
                        <View
                          style={[
                            styles.activityBar,
                            styles.activityBarInfo,
                            {
                              width: `${(entry.count / weekdayDistributionMax) * 100}%`
                            }
                          ]}
                        />
                      </View>
                      <Text style={styles.activityValue}>{entry.count}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.chartCard}>
                  <Text style={styles.chartTitle}>Issue Composition (Pie)</Text>
                  <DonutChart
                    slices={[
                      { label: "Resolved", value: analytics.resolvedIssues, color: colors.success },
                      { label: "Open", value: analytics.openIssues, color: colors.warning }
                    ]}
                  />
                  <View style={styles.pieLegend}>
                    <View style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                      <Text style={styles.legendText}>Resolved: {analytics.resolvedIssues}</Text>
                    </View>
                    <View style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
                      <Text style={styles.legendText}>Open: {analytics.openIssues}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.chartCard}>
                  <Text style={styles.chartTitle}>Top Citizen Contributors</Text>
                  {topIssueContributors.length === 0 ? (
                    <Text style={styles.chartMeta}>No issue submissions in the past 30 days.</Text>
                  ) : null}
                  {topIssueContributors.map((contributor, index) => (
                    <View key={`${contributor.userEmail}-${index}`} style={styles.contributorRow}>
                      <View style={styles.contributorMeta}>
                        <Text style={styles.contributorName}>{contributor.userName}</Text>
                        <Text style={styles.contributorEmail}>{contributor.userEmail}</Text>
                      </View>
                      <Text style={styles.contributorCount}>{contributor.issueCount}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.analyticsStatsRow}>
                  <View style={[styles.analyticsItem, styles.analyticsStatCard]}>
                    <Text style={styles.analyticsLabel}>Open Issues</Text>
                    <Text style={styles.analyticsValue}>{analytics.openIssues}</Text>
                  </View>
                  <View style={[styles.analyticsItem, styles.analyticsStatCard]}>
                    <Text style={styles.analyticsLabel}>Active Citizens</Text>
                    <Text style={styles.analyticsValue}>{analytics.activeCitizensCount}</Text>
                  </View>
                </View>
                <View style={styles.analyticsStatsRow}>
                  <View style={[styles.analyticsItem, styles.analyticsStatCard]}>
                    <Text style={styles.analyticsLabel}>Resolved Issues</Text>
                    <Text style={styles.analyticsValue}>{analytics.resolvedIssues}</Text>
                  </View>
                  <View style={[styles.analyticsItem, styles.analyticsStatCard]}>
                    <Text style={styles.analyticsLabel}>Blogs Approved (Month)</Text>
                    <Text style={styles.analyticsValue}>{analytics.approvedBlogsThisMonth}</Text>
                  </View>
                </View>
                <View style={styles.analyticsStatsRow}>
                  <View style={[styles.analyticsItem, styles.analyticsStatCard]}>
                    <Text style={styles.analyticsLabel}>Avg Issues per Citizen</Text>
                    <Text style={styles.analyticsValue}>{analytics.avgIssuesPerCitizen}</Text>
                  </View>
                  <View style={[styles.analyticsItem, styles.analyticsStatCard]}>
                    <Text style={styles.analyticsLabel}>Issues Submitted (Month)</Text>
                    <Text style={styles.analyticsValue}>{analytics.issuesSubmittedThisMonth}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <Text style={styles.cardMeta}>No analytics data available yet.</Text>
            )}
          </View>
        ) : null}

        {activeTab === "issues" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Open Citizen Issues ({issues.length})</Text>
            {issues.length === 0 ? <Text style={styles.cardMeta}>No open issues</Text> : null}
            {issues.map((issue) => (
              <View key={issue._id} style={styles.itemBox}>
                <Text style={styles.itemTitle}>{issue.subject}</Text>
                <Text style={styles.cardMeta}>
                  {issue.userName} ({issue.userEmail})
                </Text>
                <Text style={styles.itemBody}>{issue.description}</Text>
                
                {issue.media && issue.media.length > 0 && (
                  <View style={styles.mediaContainer}>
                    <Text style={styles.mediaLabel}>Attachments ({issue.media.length})</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
                      {issue.media.map((media, idx) => (
                        <View key={idx} style={styles.mediaItem}>
                          {media.mediaType === "image" ? (
                            <Image 
                              source={{ uri: media.mediaUrl }} 
                              style={styles.mediaImage}
                            />
                          ) : (
                            <IssueMediaVideo uri={media.mediaUrl} />
                          )}
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
                
                {issue.status === "open" ? (
                  <PrimaryButton 
                    label={processingIssueId === issue._id ? "Sending..." : "Mark Completed"} 
                    onPress={() => handleIssueCompletion(issue._id, user?.firstName || "Admin")}
                    disabled={processingIssueId === issue._id}
                  />
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {activeTab === "content" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Content Approval Queue ({pendingBlogs.length})</Text>
            <Text style={styles.cardMeta}>All incoming content pending moderation appears in this tab.</Text>
            {pendingBlogs.length === 0 ? <Text style={styles.cardMeta}>No pending content for approval</Text> : null}
            {pendingBlogs.map((blog) => (
              <View key={blog._id} style={styles.itemBox}>
                <Text style={styles.itemTitle}>{blog.title}</Text>
                <Text style={styles.cardMeta}>By: {blog.authorName}</Text>
                <Text style={styles.itemBody}>{blog.content}</Text>

                {blog.media && blog.media.length > 0 ? (
                  <View style={styles.mediaContainer}>
                    <Text style={styles.mediaLabel}>Attachments ({blog.media.length})</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
                      {blog.media.map((media, idx) => (
                        <View key={idx} style={styles.mediaItem}>
                          {media.mediaType === "image" ? (
                            <Image
                              source={{ uri: media.mediaUrl }}
                              style={styles.mediaImage}
                            />
                          ) : (
                            <IssueMediaVideo uri={media.mediaUrl} />
                          )}
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}

                <PrimaryButton label="Approve" onPress={() => handleApprove(blog._id)} />
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <PrimaryButton label="Logout" onPress={handleLogout} />
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
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.primary,
    alignItems: "center"
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: "bold",
    color: colors.text,
    textAlign: "center"
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginTop: spacing.sm
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden"
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    backgroundColor: colors.surface
  },
  tabButtonActive: {
    backgroundColor: colors.primary
  },
  tabButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.textSecondary
  },
  tabButtonTextActive: {
    color: colors.surface
  },
  cardTitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary
  },
  message: {
    fontSize: typography.sizes.sm,
    color: colors.primaryDark,
    marginTop: spacing.sm
  },
  cardMeta: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary
  },
  itemBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.sm
  },
  itemTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    color: colors.text
  },
  itemBody: {
    fontSize: typography.sizes.sm,
    color: colors.text
  },
  analyticsGrid: {
    marginTop: spacing.md,
    gap: spacing.sm
  },
  analyticsStatsRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  analyticsItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.background
  },
  analyticsStatCard: {
    flex: 1
  },
  analyticsLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs
  },
  analyticsValue: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    color: colors.text
  },
  chartCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    gap: spacing.sm
  },
  chartTitle: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: "700"
  },
  chartMeta: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary
  },
  donutWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.xs
  },
  pieTrack: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "flex-start",
    justifyContent: "center"
  },
  pieFillWrap: {
    width: "100%",
    height: "100%",
    justifyContent: "center"
  },
  pieFill: {
    height: "100%"
  },
  donutCenter: {
    position: "absolute",
    alignItems: "center"
  },
  donutValue: {
    fontSize: typography.sizes.lg,
    fontWeight: "700",
    color: colors.text
  },
  donutLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary
  },
  pieLegend: {
    gap: spacing.xs
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  legendText: {
    fontSize: typography.sizes.xs,
    color: colors.text
  },
  scatterWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.sm,
    backgroundColor: colors.background,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs
  },
  scatterCanvas: {
    alignSelf: "center",
    position: "relative"
  },
  scatterAxisX: {
    position: "absolute",
    height: 1.5,
    backgroundColor: colors.border
  },
  scatterAxisY: {
    position: "absolute",
    width: 1.5,
    backgroundColor: colors.border
  },
  scatterDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary
  },
  behaviorRow: {
    gap: spacing.xs
  },
  behaviorRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  behaviorValue: {
    fontSize: typography.sizes.xs,
    color: colors.text,
    fontWeight: "700"
  },
  progressTrack: {
    width: "100%",
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: 999
  },
  progressFillSuccess: {
    backgroundColor: colors.success
  },
  progressFillPrimary: {
    backgroundColor: colors.primary
  },
  progressFillInfo: {
    backgroundColor: colors.info
  },
  progressFillWarning: {
    backgroundColor: colors.warning
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  activityLabel: {
    width: 110,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary
  },
  activityTrack: {
    flex: 1,
    height: 12,
    backgroundColor: colors.border,
    borderRadius: 999,
    overflow: "hidden"
  },
  activityBar: {
    height: "100%",
    borderRadius: 999,
    minWidth: 6
  },
  activityBarPrimary: {
    backgroundColor: colors.primary
  },
  activityBarSuccess: {
    backgroundColor: colors.success
  },
  activityBarInfo: {
    backgroundColor: colors.info
  },
  activityBarWarning: {
    backgroundColor: colors.warning
  },
  activityValue: {
    width: 28,
    textAlign: "right",
    fontSize: typography.sizes.xs,
    color: colors.text,
    fontWeight: "700"
  },
  weeklyBarsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.xs,
    paddingTop: spacing.sm
  },
  weekBarWrap: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs
  },
  weekBarTrack: {
    width: "100%",
    height: 82,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: spacing.xs,
    overflow: "hidden"
  },
  weekBarFill: {
    width: "100%",
    backgroundColor: colors.primary
  },
  weekBarLabel: {
    fontSize: 10,
    color: colors.textSecondary
  },
  weekBarValue: {
    fontSize: 10,
    color: colors.text,
    fontWeight: "700"
  },
  contributorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background
  },
  contributorMeta: {
    flex: 1,
    marginRight: spacing.sm
  },
  contributorName: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: "600"
  },
  contributorEmail: {
    fontSize: 11,
    color: colors.textSecondary
  },
  contributorCount: {
    fontSize: typography.sizes.md,
    color: colors.primary,
    fontWeight: "700"
  },
  mediaContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  mediaLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.sm
  },
  mediaScroll: {
    marginHorizontal: -spacing.md
  },
  mediaItem: {
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm
  },
  mediaImage: {
    width: 120,
    height: 120,
    borderRadius: spacing.sm,
    backgroundColor: colors.border
  },
  mediaVideo: {
    width: 120,
    height: 120,
    borderRadius: spacing.sm,
    backgroundColor: colors.border
  },
  mediaVideoWrap: {
    width: 120,
    height: 120,
    borderRadius: spacing.sm,
    overflow: "hidden",
    backgroundColor: "#000"
  },
  mediaVideoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center"
  },
  mediaVideoOverlayText: {
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: spacing.xs,
    fontSize: typography.sizes.xs,
    fontWeight: "700"
  },
  mediaVideoFullscreen: {
    position: "absolute",
    right: 6,
    bottom: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)"
  },
  mediaVideoFullscreenText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700"
  },
  footer: {
    padding: spacing.xl
  }
});
