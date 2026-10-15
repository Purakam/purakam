import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme';

export default function BroadcastingTimer({ createdAt, onTimeout, maxSeconds = 300 }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimedOut, setIsTimedOut] = useState(false);

  // Animated pulsing scale for radar
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    let initialElapsed = 0;
    if (createdAt) {
      // Append 'Z' if timestamp lacks timezone offset so JavaScript parses it in UTC safely
      const isoStr = (createdAt.includes('Z') || createdAt.includes('+')) ? createdAt : `${createdAt}Z`;
      const createdDate = new Date(isoStr);
      if (!isNaN(createdDate.getTime())) {
        const diffInSec = Math.floor((Date.now() - createdDate.getTime()) / 1000);
        // Only use diffInSec if it is realistic (between 0 and 5 minutes)
        if (diffInSec > 0 && diffInSec < maxSeconds) {
          initialElapsed = diffInSec;
        }
      }
    }

    setElapsedSeconds(initialElapsed);

    // 1-second tick timer
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        if (next >= maxSeconds) {
          clearInterval(interval);
          setIsTimedOut(true);
          if (onTimeout) onTimeout();
          return maxSeconds;
        }
        return next;
      });
    }, 1000);

    // Continuous radar pulse animation loop
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.4,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => {
      clearInterval(interval);
      pulseAnimation.stop();
    };
  }, [createdAt, maxSeconds]);

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, isTimedOut && styles.containerTimedOut]}>
      <View style={styles.leftRow}>
        <View style={styles.pulseContainer}>
          {!isTimedOut && (
            <Animated.View
              style={[
                styles.pulseRing,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
          )}
          <View style={[styles.pulseCenter, isTimedOut && styles.pulseCenterTimedOut]}>
            <MaterialCommunityIcons
              name={isTimedOut ? "clock-alert-outline" : "radar"}
              size={14}
              color={isTimedOut ? colors.error : "#F59E0B"}
            />
          </View>
        </View>

        <View style={styles.textColumn}>
          <Text style={[styles.title, isTimedOut && styles.titleTimedOut]}>
            {isTimedOut ? "Search Timed Out (05:00)" : "Broadcasting to nearby partners..."}
          </Text>
          <Text style={styles.subtitle}>
            {isTimedOut
              ? "Request auto-cancelled after 5 minutes"
              : "First available local specialist will accept"}
          </Text>
        </View>
      </View>

      <View style={[styles.timerBadge, isTimedOut && styles.timerBadgeTimedOut]}>
        <MaterialCommunityIcons
          name="clock-outline"
          size={13}
          color={isTimedOut ? colors.error : colors.textSecondary}
        />
        <Text style={[styles.timerText, isTimedOut && styles.timerTextTimedOut]}>
          {formatTimer(elapsedSeconds)}
        </Text>
      </View>
    </View>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    leftRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    pulseContainer: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pulseRing: {
      position: 'absolute',
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: 'rgba(245, 158, 11, 0.25)',
    },
    pulseCenter: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    textColumn: {
      flex: 1,
    },
    title: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 2,
    },
    timerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 6,
      gap: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    timerText: {
      fontSize: 12,
      fontWeight: '800',
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      color: colors.textPrimary,
    },
    containerTimedOut: {
      borderColor: 'rgba(239, 68, 68, 0.3)',
      backgroundColor: 'rgba(239, 68, 68, 0.04)',
    },
    pulseCenterTimedOut: {
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
    },
    titleTimedOut: {
      color: colors.error,
    },
    timerBadgeTimedOut: {
      borderColor: 'rgba(239, 68, 68, 0.3)',
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
    },
    timerTextTimedOut: {
      color: colors.error,
    },
  });
