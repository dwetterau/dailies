import {
  taskyApi,
  useTaskyAction,
  useTaskyAuth,
  useTaskyQuery,
} from "@/lib/tasky";
import type { FunctionReturnType } from "convex/server";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Button,
  PlatformColor,
  StyleSheet,
  Text,
  View,
} from "react-native";

type PortfolioSnapshot = FunctionReturnType<
  typeof taskyApi.portfolio.getSnapshot
>;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export default function UnifiedDashboard() {
  const taskyAuth = useTaskyAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioSnapshot | null>(null);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);

  const closedAfter = useMemo(() => Date.now() - 32 * 24 * 60 * 60 * 1000, []);
  const taskyEnabled =
    taskyAuth.isAuthenticated && taskyAuth.convexAuthenticated;
  const currentUser = useTaskyQuery(
    taskyApi.users.currentUser,
    taskyEnabled ? {} : "skip",
  );
  const tasks = useTaskyQuery(
    taskyApi.tasks.list,
    taskyEnabled ? { closedAfter } : "skip",
  );
  const captures = useTaskyQuery(
    taskyApi.captures.list,
    taskyEnabled ? { includeCompleted: false } : "skip",
  );
  const notes = useTaskyQuery(taskyApi.notes.list, taskyEnabled ? {} : "skip");
  const tags = useTaskyQuery(taskyApi.tags.list, taskyEnabled ? {} : "skip");
  const getPortfolioSnapshot = useTaskyAction(taskyApi.portfolio.getSnapshot);

  const urgentTasks = useMemo(
    () =>
      (tasks.data ?? []).filter(
        (task) => task.priority === "urgent" || task.priority === "high",
      ),
    [tasks.data],
  );

  const refreshPortfolio = useCallback(async () => {
    if (!taskyEnabled) return;
    setIsLoadingPortfolio(true);
    setPortfolioError(null);
    try {
      const snapshot = await getPortfolioSnapshot({ includePriceStatus: true });
      setPortfolio(snapshot);
    } catch (error) {
      setPortfolioError(
        error instanceof Error ? error.message : "Failed to load portfolio",
      );
    } finally {
      setIsLoadingPortfolio(false);
    }
  }, [getPortfolioSnapshot, taskyEnabled]);

  useEffect(() => {
    void refreshPortfolio();
  }, [refreshPortfolio]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectError(null);
    try {
      await taskyAuth.connect();
    } catch (error) {
      setConnectError(
        error instanceof Error ? error.message : "Failed to connect Tasky",
      );
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.heading}>Unified App</Text>
        <Text style={styles.body}>
          Dailies is signed in with Auth0. Tasky and portfolio data use a
          separate Tasky login.
        </Text>
        {!taskyAuth.isConfigured ? (
          <Text style={styles.error}>
            Tasky URLs are missing from app.json.
          </Text>
        ) : taskyAuth.isAuthenticated ? (
          <View style={styles.rowBetween}>
            <View style={styles.flex}>
              <Text style={styles.label}>Tasky connected</Text>
              <Text style={styles.body}>
                {currentUser.data?.name ??
                  taskyAuth.userName ??
                  taskyAuth.userEmail ??
                  "Signed in"}
              </Text>
            </View>
            <Button title="Disconnect" onPress={taskyAuth.disconnect} />
          </View>
        ) : (
          <View style={styles.gap}>
            <Button
              title={isConnecting ? "Connecting..." : "Connect Tasky"}
              onPress={handleConnect}
              disabled={isConnecting || taskyAuth.isPending}
            />
            {(connectError || taskyAuth.error) && (
              <Text style={styles.error}>
                {connectError ?? taskyAuth.error}
              </Text>
            )}
          </View>
        )}
      </View>

      {taskyAuth.isAuthenticated ? (
        <View style={styles.card}>
          <Text style={styles.heading}>Tasky</Text>
          {!taskyAuth.convexAuthenticated ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator />
              <Text style={styles.body}>Preparing live Tasky data...</Text>
            </View>
          ) : (
            <>
              <View style={styles.metricGrid}>
                <Metric label="Open tasks" value={tasks.data?.length ?? 0} />
                <Metric label="Urgent/high" value={urgentTasks.length} />
                <Metric label="Captures" value={captures.data?.length ?? 0} />
                <Metric label="Notes" value={notes.data?.length ?? 0} />
                <Metric label="Tags" value={tags.data?.length ?? 0} />
              </View>
              {(tasks.error || captures.error || notes.error || tags.error) && (
                <Text style={styles.error}>
                  {tasks.error ?? captures.error ?? notes.error ?? tags.error}
                </Text>
              )}
            </>
          )}
        </View>
      ) : null}

      {taskyAuth.isAuthenticated ? (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.heading}>Portfolio</Text>
            <Button
              title="Refresh"
              onPress={refreshPortfolio}
              disabled={isLoadingPortfolio || !taskyEnabled}
            />
          </View>
          {isLoadingPortfolio && !portfolio ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator />
              <Text style={styles.body}>Loading portfolio...</Text>
            </View>
          ) : portfolio?.status === "ok" ? (
            <View style={styles.gap}>
              <View style={styles.metricGrid}>
                <Metric
                  label="Value"
                  value={formatCurrency(portfolio.summary.totalCurrentValue)}
                />
                <Metric
                  label="Gain/loss"
                  value={formatCurrency(portfolio.summary.gainLoss)}
                />
                <Metric
                  label="Return"
                  value={formatPercent(portfolio.summary.gainLossPercent)}
                />
                <Metric
                  label="Holdings"
                  value={portfolio.summary.holdingsCount}
                />
              </View>
              <Text style={styles.body}>
                Latest price data: {portfolio.summary.latestPriceDate ?? "none"}
              </Text>
            </View>
          ) : (
            <Text
              style={
                portfolio?.status === "no_credentials"
                  ? styles.body
                  : styles.error
              }
            >
              {portfolio?.message ??
                portfolioError ??
                "Add portfolio credentials in Tasky settings to enable this view."}
            </Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 20,
    gap: 14,
  },
  card: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PlatformColor("separator"),
    backgroundColor: PlatformColor("secondarySystemBackground"),
    padding: 14,
    gap: 10,
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
    color: PlatformColor("label"),
  },
  body: {
    fontSize: 14,
    color: PlatformColor("secondaryLabel"),
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: PlatformColor("label"),
  },
  error: {
    fontSize: 13,
    color: PlatformColor("systemRed"),
  },
  gap: {
    gap: 8,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  inlineLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metric: {
    minWidth: 92,
    borderRadius: 10,
    backgroundColor: PlatformColor("tertiarySystemBackground"),
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metricValue: {
    fontSize: 17,
    fontWeight: "700",
    color: PlatformColor("label"),
  },
  metricLabel: {
    fontSize: 11,
    color: PlatformColor("secondaryLabel"),
  },
});
