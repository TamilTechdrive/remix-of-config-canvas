export interface SampleProject {
  id: string;
  name: string;
  description: string;
  tags: string[];
  category: string;
}

export const SAMPLE_PROJECTS: SampleProject[] = [
  {
    id: 'iptv-basic',
    name: 'IPTV Basic Platform',
    description: 'Basic IPTV set-top box configuration with standard channel lineup and EPG support',
    tags: ['iptv', 'epg', 'basic'],
    category: 'IPTV',
  },
  {
    id: 'iptv-advanced',
    name: 'IPTV Advanced Platform',
    description: 'Advanced IPTV with DVR, timeshift, multi-screen, and adaptive streaming',
    tags: ['iptv', 'dvr', 'timeshift', 'advanced'],
    category: 'IPTV',
  },
  {
    id: 'dvb-satellite',
    name: 'DVB-S2 Satellite Receiver',
    description: 'DVB-S/S2 satellite receiver with DiSEqC, CI+ slot, and PVR capabilities',
    tags: ['dvb', 'satellite', 'dvb-s2', 'pvr'],
    category: 'DVB',
  },
  {
    id: 'dvb-terrestrial',
    name: 'DVB-T2 Terrestrial Receiver',
    description: 'DVB-T/T2 terrestrial STB with HbbTV support and HEVC decoding',
    tags: ['dvb', 'terrestrial', 'dvb-t2', 'hbbtv'],
    category: 'DVB',
  },
  {
    id: 'dvb-cable',
    name: 'DVB-C Cable Receiver',
    description: 'DVB-C/C2 cable set-top box with integrated cable modem and DOCSIS support',
    tags: ['dvb', 'cable', 'dvb-c', 'docsis'],
    category: 'DVB',
  },
  {
    id: 'ott-android',
    name: 'Android TV OTT Box',
    description: 'Android TV based OTT streaming box with Google Cast, Netflix, and app store',
    tags: ['ott', 'android-tv', 'streaming', 'cast'],
    category: 'OTT',
  },
  {
    id: 'ott-linux',
    name: 'Linux OTT Streamer',
    description: 'Lightweight Linux-based OTT media player with DASH/HLS and DRM support',
    tags: ['ott', 'linux', 'dash', 'drm'],
    category: 'OTT',
  },
  {
    id: 'hybrid-dvb-ott',
    name: 'Hybrid DVB + OTT Platform',
    description: 'Hybrid STB combining DVB-S2/T2 broadcast with OTT streaming and catch-up TV',
    tags: ['hybrid', 'dvb', 'ott', 'catch-up'],
    category: 'Hybrid',
  },
  {
    id: 'hotel-hospitality',
    name: 'Hotel Hospitality STB',
    description: 'Hospitality-grade STB with guest management, info portal, and VOD system',
    tags: ['hospitality', 'hotel', 'vod', 'portal'],
    category: 'Hospitality',
  },
  {
    id: 'enterprise-signage',
    name: 'Enterprise Digital Signage',
    description: 'Digital signage player with CMS integration, scheduling, and remote management',
    tags: ['signage', 'enterprise', 'cms', 'remote'],
    category: 'Enterprise',
  },
  {
    id: 'telecom-operator',
    name: 'Telecom Operator Bundle',
    description: 'Full telecom operator STB platform with IPTV, VoIP, and triple-play services',
    tags: ['telecom', 'operator', 'voip', 'triple-play'],
    category: 'Telecom',
  },
  {
    id: 'education-platform',
    name: 'Education Streaming Platform',
    description: 'Educational content delivery STB with LMS integration and parental controls',
    tags: ['education', 'lms', 'parental-controls'],
    category: 'Education',
  },
];
