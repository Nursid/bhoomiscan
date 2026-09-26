import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

export interface TopographyBackgroundProps {
  opacity?: number;
}

export default function TopographyBackground({ opacity = 0.35 }: TopographyBackgroundProps) {
  return (
    <View pointerEvents="none" style={[styles.container, { opacity }]}>
      <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="topoGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#DFB05B" stopOpacity="0.4" />
            <Stop offset="50%" stopColor="#F5D38F" stopOpacity="0.18" />
            <Stop offset="100%" stopColor="#B88E3C" stopOpacity="0.05" />
          </LinearGradient>
        </Defs>

        {/* Topographic Contour Lines */}
        <Path
          d="M-50 100 Q 100 40 250 140 T 450 80"
          stroke="url(#topoGoldGrad)"
          strokeWidth="1.2"
          fill="none"
        />
        <Path
          d="M-50 140 Q 120 70 270 180 T 450 120"
          stroke="url(#topoGoldGrad)"
          strokeWidth="1.4"
          fill="none"
        />
        <Path
          d="M-50 180 Q 140 100 290 220 T 450 160"
          stroke="url(#topoGoldGrad)"
          strokeWidth="1.2"
          fill="none"
        />
        <Path
          d="M-50 240 Q 100 320 280 250 T 450 310"
          stroke="url(#topoGoldGrad)"
          strokeWidth="1"
          fill="none"
        />
        <Path
          d="M-50 300 Q 150 400 310 320 T 450 380"
          stroke="url(#topoGoldGrad)"
          strokeWidth="1.5"
          fill="none"
        />
        <Path
          d="M-50 360 Q 80 460 260 390 T 450 450"
          stroke="url(#topoGoldGrad)"
          strokeWidth="1.2"
          fill="none"
        />

        {/* Lower Tapestry Contour Curves */}
        <Path
          d="M-50 520 Q 120 480 280 580 T 450 510"
          stroke="url(#topoGoldGrad)"
          strokeWidth="1.3"
          fill="none"
        />
        <Path
          d="M-50 580 Q 150 530 300 640 T 450 570"
          stroke="url(#topoGoldGrad)"
          strokeWidth="1.1"
          fill="none"
        />
        <Path
          d="M-50 640 Q 100 700 320 680 T 450 720"
          stroke="url(#topoGoldGrad)"
          strokeWidth="1.4"
          fill="none"
        />

        {/* Connected Asset Tapestry Nodes */}
        <Circle cx="120" cy="70" r="3" fill="#DFB05B" opacity="0.6" />
        <Circle cx="250" cy="140" r="4.5" fill="#DFB05B" opacity="0.8" />
        <Circle cx="270" cy="180" r="3" fill="#DFB05B" opacity="0.6" />
        <Circle cx="100" cy="320" r="4" fill="#DFB05B" opacity="0.7" />
        <Circle cx="310" cy="320" r="5" fill="#F5D38F" opacity="0.9" />
        <Circle cx="280" cy="580" r="3.5" fill="#DFB05B" opacity="0.7" />

        {/* Faint Connecting Nodes Thread Lines */}
        <Path
          d="M120 70 L250 140 L310 320 L280 580"
          stroke="#DFB05B"
          strokeWidth="0.8"
          strokeDasharray="3,3"
          opacity="0.4"
          fill="none"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
});
