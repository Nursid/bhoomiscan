import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, Text, Image } from 'react-native';
import Svg, { Path, Circle, Polygon, Line, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { COLORS, FONTS } from '../theme';
import { IMAGES } from '../assets';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface CompassLandOrbGraphicProps {
  size?: number;
  percentage?: number;
  userName?: string;
  autoIncrement?: boolean;
  showCards?: boolean;
}

export default function CompassLandOrbGraphic({
  size = 220,
  percentage = 0,
  userName = 'User',
  autoIncrement = true,
  showCards = false,
}: CompassLandOrbGraphicProps) {
  const [percentDisplay, setPercentDisplay] = useState(0);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const emeraldGlowAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Circumference of inner green arc circle (2 * Math.PI * 54 = ~339.29)
  const arcCircumference = 339;

  useEffect(() => {
    // 1. Continuous smooth 60fps rotation for outer compass bezel
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // 2. Emerald arc glow pulse loop
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(emeraldGlowAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(emeraldGlowAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // 3. Clean Continuous Forward Progress Loop
    const progressLoop = Animated.loop(
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 3600,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );

    let lastPercent = -1;
    const listenerId = progressAnim.addListener(({ value }) => {
      const newPercent = Math.min(100, Math.max(0, Math.floor(value * 100)));
      if (newPercent !== lastPercent) {
        lastPercent = newPercent;
        setPercentDisplay(newPercent);
      }
    });

    rotateLoop.start();
    glowLoop.start();
    if (autoIncrement) {
      progressLoop.start();
    }

    return () => {
      progressAnim.removeListener(listenerId);
      rotateLoop.stop();
      glowLoop.stop();
      progressLoop.stop();
    };
  }, [rotateAnim, emeraldGlowAnim, progressAnim, autoIncrement]);

  const compassRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const emeraldGlowOpacity = emeraldGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  });

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [arcCircumference, 0],
  });

  return (
    <View style={styles.masterWrapper}>
      {/* Compass + Arc Ring + Center Project Assets logo.png */}
      <View style={[styles.compassOrbBox, { width: size, height: size }]}>
        {/* Outer Constellation Orbit & Golden Compass Ring */}
        <Animated.View
          style={[
            styles.compassAbsolute,
            {
              transform: [{ rotate: compassRotation }],
            },
          ]}
        >
          <Svg width={size} height={size} viewBox="0 0 210 210" fill="none">
            <Defs>
              <LinearGradient id="compassGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#FFE5A4" />
                <Stop offset="30%" stopColor="#DFB05B" />
                <Stop offset="70%" stopColor="#B88E3C" />
                <Stop offset="100%" stopColor="#6E4F18" />
              </LinearGradient>
            </Defs>

            {/* Outer Constellation Curve & Orbital Node Points */}
            <Circle cx="105" cy="105" r="100" stroke="rgba(223, 176, 91, 0.18)" strokeWidth="1" fill="none" />
            <Circle cx="105" cy="5" r="2.8" fill="#DFB05B" />
            <Circle cx="200" cy="85" r="3" fill="#FFE5A4" />
            <Circle cx="12" cy="125" r="2.5" fill="#DFB05B" />
            <Circle cx="188" cy="150" r="3.5" fill="#FFE5A4" />

            {/* Outer Multi-Ring Compass Bezel */}
            <Circle cx="105" cy="105" r="92" stroke="url(#compassGoldGrad)" strokeWidth="2.2" fill="none" />
            <Circle cx="105" cy="105" r="84" stroke="rgba(223, 176, 91, 0.45)" strokeWidth="1" strokeDasharray="2,3" fill="none" />
            <Circle cx="105" cy="105" r="75" stroke="url(#compassGoldGrad)" strokeWidth="1.8" fill="none" />
            <Circle cx="105" cy="105" r="66" stroke="rgba(223, 176, 91, 0.28)" strokeWidth="1" fill="none" />

            {/* 4 Golden Arrowhead Direction Needles (N, E, S, W) */}
            <Polygon points="105,7 110,21 105,17 100,21" fill="#FFE5A4" />
            <Polygon points="105,203 110,189 105,193 100,189" fill="#FFE5A4" />
            <Polygon points="203,105 189,110 193,105 189,100" fill="#FFE5A4" />
            <Polygon points="7,105 21,110 17,105 21,100" fill="#FFE5A4" />

            {/* Inner Degree Ticks */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, idx) => (
              <Line
                key={idx}
                x1="105"
                y1="24"
                x2="105"
                y2="28"
                stroke="#DFB05B"
                strokeWidth="1.5"
                transform={`rotate(${angle} 105 105)`}
              />
            ))}
          </Svg>
        </Animated.View>

        {/* Inner Glowing Cyan Arc Ring */}
        <Animated.View style={[styles.centerAbsolute, { opacity: emeraldGlowOpacity }]}>
          <Svg width={150} height={150} viewBox="0 0 150 150" fill="none">
            <Defs>
              <LinearGradient id="cyanArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#80FFF9" />
                <Stop offset="50%" stopColor="#05C9A7" />
                <Stop offset="100%" stopColor="#00E5A3" />
              </LinearGradient>
            </Defs>

            {/* Background Track Circle */}
            <Circle cx="75" cy="75" r="54" stroke="rgba(5, 201, 167, 0.15)" strokeWidth="6" fill="none" />

            {/* Ultra-Smooth 60fps Native Animated Glowing Cyan Arc Ring */}
            <AnimatedCircle
              cx="75"
              cy="75"
              r="54"
              stroke="url(#cyanArcGrad)"
              strokeWidth="6"
              strokeDasharray={arcCircumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              transform="rotate(-90 75 75)"
            />
          </Svg>
        </Animated.View>

        {/* Center Project Assets logo.png */}
        <Image
          source={IMAGES.logo}
          style={{ width: size * 0.42, height: size * 0.42, position: 'absolute' }}
          resizeMode="contain"
        />
      </View>

      {/* Optional Progress Card if showCards is true */}
      {showCards && (
        <>
          <View style={styles.progressCard}>
            <Text style={styles.cardHeaderTitle}>LAND VERIFICATION</Text>
            <Text style={styles.cardSubTitle}>IN PROGRESS</Text>
            <Text style={styles.percentageText}>{percentDisplay}%</Text>
            <Text style={styles.cardFooterText}>COMPLETED</Text>
          </View>

          <View style={styles.userStatusPill}>
            <Text style={styles.userNameText}>{userName}</Text>
            <Text style={styles.userRoleText}> | Global Citizen</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  masterWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  compassOrbBox: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  compassAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerAbsolute: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCard: {
    backgroundColor: '#0E1017',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(223, 176, 91, 0.4)',
    paddingHorizontal: 28,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 18,
    width: 260,
  },
  cardHeaderTitle: {
    color: '#DFB05B',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: FONTS.heading,
  },
  cardSubTitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 9.5,
    letterSpacing: 1.5,
    marginTop: 2,
    fontFamily: FONTS.medium,
  },
  percentageText: {
    color: '#05C9A7',
    fontSize: 34,
    fontWeight: '800',
    marginVertical: 4,
    fontFamily: FONTS.heading,
  },
  cardFooterText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    letterSpacing: 2,
    fontFamily: FONTS.medium,
  },
  userStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 16, 23, 0.85)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(223, 176, 91, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: 14,
  },
  userNameText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: FONTS.medium,
  },
  userRoleText: {
    color: '#DFB05B',
    fontSize: 11,
    fontFamily: FONTS.light,
  },
});
