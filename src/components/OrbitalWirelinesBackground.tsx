import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function OrbitalWirelinesBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} viewBox={`0 0 ${SCREEN_WIDTH} ${SCREEN_HEIGHT}`}>
        <Defs>
          <LinearGradient id="goldWireGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#DFB05B" stopOpacity="0.8" />
            <Stop offset="50%" stopColor="#F5D38F" stopOpacity="0.9" />
            <Stop offset="100%" stopColor="#966D26" stopOpacity="0.4" />
          </LinearGradient>

          <LinearGradient id="darkWireGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#303545" stopOpacity="0.7" />
            <Stop offset="100%" stopColor="#12141C" stopOpacity="0.3" />
          </LinearGradient>
        </Defs>

        {/* 1. Golden Swooping Curves Across Top & Middle */}
        <Path
          d={`M -20, ${SCREEN_HEIGHT * 0.12} C ${SCREEN_WIDTH * 0.3}, ${SCREEN_HEIGHT * 0.05} ${SCREEN_WIDTH * 0.7}, ${SCREEN_HEIGHT * 0.2} ${SCREEN_WIDTH + 30}, ${SCREEN_HEIGHT * 0.1}`}
          fill="none"
          stroke="url(#goldWireGrad)"
          strokeWidth="1.8"
        />
        <Path
          d={`M -30, ${SCREEN_HEIGHT * 0.18} C ${SCREEN_WIDTH * 0.4}, ${SCREEN_HEIGHT * 0.1} ${SCREEN_WIDTH * 0.8}, ${SCREEN_HEIGHT * 0.3} ${SCREEN_WIDTH + 40}, ${SCREEN_HEIGHT * 0.28}`}
          fill="none"
          stroke="url(#goldWireGrad)"
          strokeWidth="2.2"
        />
        <Path
          d={`M -20, ${SCREEN_HEIGHT * 0.38} C ${SCREEN_WIDTH * 0.3}, ${SCREEN_HEIGHT * 0.22} ${SCREEN_WIDTH * 0.75}, ${SCREEN_HEIGHT * 0.45} ${SCREEN_WIDTH + 30}, ${SCREEN_HEIGHT * 0.32}`}
          fill="none"
          stroke="url(#goldWireGrad)"
          strokeWidth="1.6"
        />

        {/* 2. Dark Wirelines */}
        <Path
          d={`M -40, ${SCREEN_HEIGHT * 0.26} C ${SCREEN_WIDTH * 0.2}, ${SCREEN_HEIGHT * 0.42} ${SCREEN_WIDTH * 0.8}, ${SCREEN_HEIGHT * 0.12} ${SCREEN_WIDTH + 20}, ${SCREEN_HEIGHT * 0.42}`}
          fill="none"
          stroke="url(#darkWireGrad)"
          strokeWidth="2.5"
        />
        <Path
          d={`M ${SCREEN_WIDTH * 0.76}, ${SCREEN_HEIGHT * 0.18} L ${SCREEN_WIDTH * 0.7}, ${SCREEN_HEIGHT * 0.74}`}
          fill="none"
          stroke="url(#darkWireGrad)"
          strokeWidth="1.5"
        />

        {/* 3. Golden Sphere Beads on Nodes */}
        <Circle cx={SCREEN_WIDTH * 0.28} cy={SCREEN_HEIGHT * 0.09} r="4.5" fill="#FFE5A4" stroke="#DFB05B" strokeWidth="1" />
        <Circle cx={SCREEN_WIDTH * 0.62} cy={SCREEN_HEIGHT * 0.17} r="5" fill="#FFE5A4" stroke="#DFB05B" strokeWidth="1" />
        <Circle cx={SCREEN_WIDTH * 0.67} cy={SCREEN_HEIGHT * 0.22} r="4" fill="#FFFFFF" stroke="#DFB05B" strokeWidth="1" />
        <Circle cx={SCREEN_WIDTH * 0.77} cy={SCREEN_HEIGHT * 0.41} r="4.5" fill="#FFE5A4" stroke="#DFB05B" strokeWidth="1" />
        <Circle cx={SCREEN_WIDTH * 0.7} cy={SCREEN_HEIGHT * 0.73} r="4" fill="#FFE5A4" stroke="#DFB05B" strokeWidth="1" />
      </Svg>
    </View>
  );
}
