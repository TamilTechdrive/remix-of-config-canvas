/**
 * Rich sample configuration data for a video/streaming platform.
 * 10+ root container configs with realistic hierarchy, rules, and states.
 */
export interface RawOption {
  id: number;
  key: string;
  name: string;
  editable: boolean;
  included: boolean;
}

export interface RawRule {
  option_key: string;
  requires?: string[];
  conflicts?: string[];
  suggestion?: string;
  impact_level?: 'low' | 'medium' | 'high' | 'critical';
  priority?: number;
  tags?: string[];
  must_enable?: boolean;
  must_disable?: boolean;
  duplicate_of?: string;
}

export interface RawState {
  [event: string]: string;
}

export interface RawGroup {
  id: number;
  name: string;
  options: RawOption[];
}

export interface RawModule {
  id: string;
  name: string;
  initial: string;
  groups: RawGroup[];
  rules: RawRule[];
  states: Record<string, RawState>;
}

export interface RawConfig {
  modules: RawModule[];
}

export const SAMPLE_CONFIG: RawConfig = {
  modules: [
    // 1. Video Decoder Module
    {
      id: "video_decoder",
      name: "Video Decoder",
      initial: "idle",
      groups: [
        {
          id: 10,
          name: "Codec Support",
          options: [
            { id: 100, key: "h264", name: "H.264/AVC", editable: true, included: true },
            { id: 101, key: "h265", name: "H.265/HEVC", editable: true, included: false },
            { id: 102, key: "vp9", name: "VP9", editable: true, included: false },
            { id: 103, key: "av1", name: "AV1", editable: true, included: false },
          ],
        },
        {
          id: 11,
          name: "Decoder Hardware",
          options: [
            { id: 110, key: "hw_accel", name: "Hardware Acceleration", editable: true, included: true },
            { id: 111, key: "gpu_decode", name: "GPU Decoding", editable: true, included: false },
            { id: 112, key: "sw_fallback", name: "Software Fallback", editable: false, included: true },
          ],
        },
      ],
      rules: [
        { option_key: "h265", requires: ["h264"], suggestion: "H.265 needs H.264 as fallback codec", impact_level: "high", priority: 8, tags: ["codec", "next-gen"] },
        { option_key: "av1", requires: ["hw_accel"], suggestion: "AV1 requires hardware acceleration for real-time decode", impact_level: "critical", priority: 9, tags: ["codec", "bleeding-edge"], must_enable: false },
        { option_key: "gpu_decode", requires: ["hw_accel"], conflicts: ["sw_fallback"], suggestion: "GPU decode conflicts with software-only mode", impact_level: "high", priority: 7, tags: ["hardware"] },
        { option_key: "vp9", requires: ["h264"], conflicts: ["av1"], suggestion: "VP9 and AV1 are competing formats — pick one", impact_level: "medium", priority: 5, tags: ["codec", "google"] },
      ],
      states: {
        idle: { INIT_DECODER: "decoding" },
        decoding: { PAUSE: "paused", ERROR: "error" },
        paused: { RESUME: "decoding", STOP: "idle" },
        error: { RETRY: "decoding", STOP: "idle" },
      },
    },
    // 2. Video Output Module
    {
      id: "video_output",
      name: "Video Output",
      initial: "idle",
      groups: [
        {
          id: 20,
          name: "Resolution",
          options: [
            { id: 200, key: "res_720p", name: "720p HD", editable: true, included: true },
            { id: 201, key: "res_1080p", name: "1080p Full HD", editable: true, included: true },
            { id: 202, key: "res_4k", name: "4K UHD", editable: true, included: false },
            { id: 203, key: "res_8k", name: "8K", editable: true, included: false },
          ],
        },
        {
          id: 21,
          name: "Color & HDR",
          options: [
            { id: 210, key: "sdr", name: "SDR", editable: false, included: true },
            { id: 211, key: "hdr10", name: "HDR10", editable: true, included: false },
            { id: 212, key: "dolby_vision", name: "Dolby Vision", editable: true, included: false },
            { id: 213, key: "hlg", name: "HLG", editable: true, included: false },
          ],
        },
      ],
      rules: [
        { option_key: "hdr10", requires: ["res_4k"], suggestion: "HDR10 requires at least 4K resolution for proper mastering", impact_level: "high", priority: 8, tags: ["hdr", "quality"] },
        { option_key: "dolby_vision", requires: ["hdr10", "res_4k"], conflicts: ["hlg"], suggestion: "Dolby Vision requires HDR10 base layer and conflicts with HLG", impact_level: "critical", priority: 10, tags: ["premium", "hdr"], must_enable: true },
        { option_key: "res_8k", requires: ["res_4k"], suggestion: "8K pipeline builds on 4K infrastructure", impact_level: "critical", priority: 3, tags: ["future-proof"] },
        { option_key: "hlg", requires: ["res_1080p"], conflicts: ["dolby_vision"], suggestion: "HLG is a broadcast standard, conflicts with Dolby Vision", impact_level: "medium", priority: 4, tags: ["broadcast"] },
      ],
      states: {
        idle: { START_OUTPUT: "rendering" },
        rendering: { ENHANCE: "hdr_active", STOP: "idle" },
        hdr_active: { DISABLE_HDR: "rendering" },
      },
    },
    // 3. Audio Engine Module
    {
      id: "audio_engine",
      name: "Audio Engine",
      initial: "idle",
      groups: [
        {
          id: 30,
          name: "Audio Codecs",
          options: [
            { id: 300, key: "aac", name: "AAC", editable: true, included: true },
            { id: 301, key: "opus", name: "Opus", editable: true, included: false },
            { id: 302, key: "flac", name: "FLAC Lossless", editable: true, included: false },
            { id: 303, key: "ac3", name: "Dolby AC-3", editable: true, included: false },
          ],
        },
        {
          id: 31,
          name: "Spatial Audio",
          options: [
            { id: 310, key: "stereo", name: "Stereo 2.0", editable: false, included: true },
            { id: 311, key: "surround_51", name: "Surround 5.1", editable: true, included: false },
            { id: 312, key: "atmos", name: "Dolby Atmos", editable: true, included: false },
            { id: 313, key: "spatial_audio", name: "Apple Spatial Audio", editable: true, included: false },
          ],
        },
      ],
      rules: [
        { option_key: "atmos", requires: ["ac3", "surround_51"], suggestion: "Dolby Atmos requires AC-3 codec and 5.1 base channel layout", impact_level: "critical", priority: 9, tags: ["premium", "spatial"] },
        { option_key: "spatial_audio", requires: ["surround_51"], conflicts: ["atmos"], suggestion: "Apple Spatial Audio conflicts with Dolby Atmos — choose one spatial format", impact_level: "high", priority: 7, tags: ["apple", "spatial"], duplicate_of: "atmos" },
        { option_key: "flac", conflicts: ["opus"], suggestion: "FLAC and Opus serve different purposes — lossless vs. low-latency", impact_level: "low", priority: 3, tags: ["lossless"] },
        { option_key: "surround_51", requires: ["aac"], suggestion: "5.1 surround needs AAC as fallback for stereo downmix", impact_level: "medium", priority: 6, tags: ["surround"] },
      ],
      states: {
        idle: { START_AUDIO: "playing" },
        playing: { ENABLE_SURROUND: "surround", STOP: "idle" },
        surround: { ENABLE_ATMOS: "atmos_active", DISABLE: "playing" },
        atmos_active: { DISABLE: "surround" },
      },
    },
    // 4. Streaming Protocol Module
    {
      id: "streaming_protocol",
      name: "Streaming Protocol",
      initial: "idle",
      groups: [
        {
          id: 40,
          name: "Protocols",
          options: [
            { id: 400, key: "hls", name: "HLS", editable: true, included: true },
            { id: 401, key: "dash", name: "MPEG-DASH", editable: true, included: false },
            { id: 402, key: "rtmp", name: "RTMP", editable: true, included: false },
            { id: 403, key: "webrtc", name: "WebRTC", editable: true, included: false },
          ],
        },
        {
          id: 41,
          name: "Adaptive Bitrate",
          options: [
            { id: 410, key: "abr_basic", name: "Basic ABR", editable: true, included: true },
            { id: 411, key: "abr_advanced", name: "AI-Driven ABR", editable: true, included: false },
            { id: 412, key: "low_latency", name: "Low-Latency Mode", editable: true, included: false },
          ],
        },
      ],
      rules: [
        { option_key: "dash", conflicts: ["hls"], suggestion: "DASH and HLS are competing adaptive protocols — typically use one" },
        { option_key: "webrtc", requires: ["low_latency"], suggestion: "WebRTC is designed for ultra-low latency delivery" },
        { option_key: "abr_advanced", requires: ["abr_basic"], suggestion: "AI-driven ABR extends the basic ABR engine" },
        { option_key: "low_latency", conflicts: ["abr_advanced"], suggestion: "Low-latency mode may conflict with complex ABR algorithms" },
        { option_key: "rtmp", conflicts: ["webrtc"], suggestion: "RTMP is legacy ingest; WebRTC is modern real-time — pick one direction" },
      ],
      states: {
        idle: { CONNECT: "buffering" },
        buffering: { READY: "streaming", ERROR: "error" },
        streaming: { ABR_SWITCH: "adapting", DISCONNECT: "idle" },
        adapting: { SETTLED: "streaming" },
        error: { RETRY: "buffering" },
      },
    },
    // 5. DRM & Security Module
    {
      id: "drm_security",
      name: "DRM & Security",
      initial: "unprotected",
      groups: [
        {
          id: 50,
          name: "DRM Systems",
          options: [
            { id: 500, key: "widevine", name: "Widevine", editable: true, included: false },
            { id: 501, key: "fairplay", name: "FairPlay", editable: true, included: false },
            { id: 502, key: "playready", name: "PlayReady", editable: true, included: false },
            { id: 503, key: "clearkey", name: "ClearKey (Test)", editable: true, included: true },
          ],
        },
        {
          id: 51,
          name: "Encryption",
          options: [
            { id: 510, key: "aes_128", name: "AES-128", editable: true, included: true },
            { id: 511, key: "cbcs", name: "CBCS", editable: true, included: false },
            { id: 512, key: "cenc", name: "CENC", editable: true, included: false },
          ],
        },
      ],
      rules: [
        { option_key: "widevine", requires: ["cenc"], suggestion: "Widevine uses CENC encryption scheme" },
        { option_key: "fairplay", requires: ["cbcs"], conflicts: ["widevine"], suggestion: "FairPlay uses CBCS and may conflict with Widevine on same content" },
        { option_key: "playready", requires: ["cenc"], suggestion: "PlayReady uses CENC encryption" },
        { option_key: "cbcs", conflicts: ["cenc"], suggestion: "CBCS and CENC are different encryption patterns — content is typically one or the other" },
      ],
      states: {
        unprotected: { ENABLE_DRM: "license_check" },
        license_check: { VALID: "protected", INVALID: "error" },
        protected: { REVOKE: "unprotected" },
        error: { RETRY: "license_check" },
      },
    },
    // 6. Transcoding Pipeline Module
    {
      id: "transcoding",
      name: "Transcoding Pipeline",
      initial: "idle",
      groups: [
        {
          id: 60,
          name: "Transcode Profiles",
          options: [
            { id: 600, key: "profile_mobile", name: "Mobile (360p/480p)", editable: true, included: true },
            { id: 601, key: "profile_web", name: "Web (720p/1080p)", editable: true, included: true },
            { id: 602, key: "profile_broadcast", name: "Broadcast (1080i/1080p)", editable: true, included: false },
            { id: 603, key: "profile_cinema", name: "Cinema (4K DCI)", editable: true, included: false },
          ],
        },
        {
          id: 61,
          name: "Processing",
          options: [
            { id: 610, key: "denoise", name: "Denoising", editable: true, included: false },
            { id: 611, key: "upscale_ai", name: "AI Upscaling", editable: true, included: false },
            { id: 612, key: "frame_interp", name: "Frame Interpolation", editable: true, included: false },
          ],
        },
      ],
      rules: [
        { option_key: "profile_cinema", requires: ["profile_broadcast"], suggestion: "Cinema profile extends broadcast pipeline" },
        { option_key: "upscale_ai", requires: ["profile_web"], conflicts: ["profile_cinema"], suggestion: "AI upscaling targets web content — cinema already has native resolution" },
        { option_key: "frame_interp", requires: ["denoise"], suggestion: "Frame interpolation works better on denoised source" },
      ],
      states: {
        idle: { START_JOB: "encoding" },
        encoding: { COMPLETE: "done", ERROR: "error" },
        done: { NEW_JOB: "encoding" },
        error: { RETRY: "encoding" },
      },
    },
    // 7. CDN & Delivery Module
    {
      id: "cdn_delivery",
      name: "CDN & Delivery",
      initial: "idle",
      groups: [
        {
          id: 70,
          name: "CDN Providers",
          options: [
            { id: 700, key: "cdn_cloudfront", name: "CloudFront", editable: true, included: true },
            { id: 701, key: "cdn_akamai", name: "Akamai", editable: true, included: false },
            { id: 702, key: "cdn_fastly", name: "Fastly", editable: true, included: false },
          ],
        },
        {
          id: 71,
          name: "Edge Features",
          options: [
            { id: 710, key: "edge_cache", name: "Edge Caching", editable: true, included: true },
            { id: 711, key: "geo_routing", name: "Geo-Routing", editable: true, included: false },
            { id: 712, key: "token_auth", name: "Token Authentication", editable: true, included: false },
          ],
        },
      ],
      rules: [
        { option_key: "cdn_akamai", conflicts: ["cdn_fastly"], suggestion: "Use one primary CDN to avoid routing conflicts" },
        { option_key: "geo_routing", requires: ["edge_cache"], suggestion: "Geo-routing depends on edge cache infrastructure" },
        { option_key: "token_auth", requires: ["edge_cache"], suggestion: "Token auth validates at the edge layer" },
      ],
      states: {
        idle: { PROVISION: "provisioning" },
        provisioning: { READY: "active", ERROR: "error" },
        active: { PURGE: "purging" },
        purging: { DONE: "active" },
        error: { RETRY: "provisioning" },
      },
    },
    // 8. Player UI Module
    {
      id: "player_ui",
      name: "Player UI",
      initial: "hidden",
      groups: [
        {
          id: 80,
          name: "Controls",
          options: [
            { id: 800, key: "play_pause", name: "Play/Pause", editable: false, included: true },
            { id: 801, key: "seekbar", name: "Seek Bar", editable: true, included: true },
            { id: 802, key: "volume", name: "Volume Control", editable: true, included: true },
            { id: 803, key: "fullscreen", name: "Fullscreen", editable: true, included: true },
            { id: 804, key: "pip", name: "Picture-in-Picture", editable: true, included: false },
          ],
        },
        {
          id: 81,
          name: "Overlays",
          options: [
            { id: 810, key: "subtitles", name: "Subtitles/CC", editable: true, included: true },
            { id: 811, key: "quality_selector", name: "Quality Selector", editable: true, included: true },
            { id: 812, key: "playback_speed", name: "Playback Speed", editable: true, included: false },
            { id: 813, key: "chapter_markers", name: "Chapter Markers", editable: true, included: false },
          ],
        },
      ],
      rules: [
        { option_key: "pip", requires: ["fullscreen"], suggestion: "PiP requires fullscreen API support" },
        { option_key: "chapter_markers", requires: ["seekbar"], suggestion: "Chapters display on the seek bar" },
        { option_key: "playback_speed", requires: ["play_pause"], suggestion: "Speed control needs base playback engine" },
      ],
      states: {
        hidden: { SHOW: "visible" },
        visible: { INTERACT: "active", TIMEOUT: "hidden" },
        active: { IDLE: "visible" },
      },
    },
    // 9. Analytics & Monitoring Module
    {
      id: "analytics",
      name: "Analytics & QoS",
      initial: "disabled",
      groups: [
        {
          id: 90,
          name: "Metrics",
          options: [
            { id: 900, key: "playback_metrics", name: "Playback Metrics", editable: true, included: true },
            { id: 901, key: "buffer_health", name: "Buffer Health", editable: true, included: true },
            { id: 902, key: "error_tracking", name: "Error Tracking", editable: true, included: true },
            { id: 903, key: "viewer_engagement", name: "Viewer Engagement", editable: true, included: false },
          ],
        },
        {
          id: 91,
          name: "Reporting",
          options: [
            { id: 910, key: "realtime_dash", name: "Real-time Dashboard", editable: true, included: false },
            { id: 911, key: "export_csv", name: "CSV Export", editable: true, included: false },
            { id: 912, key: "alerting", name: "Alert Rules", editable: true, included: false },
          ],
        },
      ],
      rules: [
        { option_key: "realtime_dash", requires: ["playback_metrics", "buffer_health"], suggestion: "Dashboard needs metrics data sources" },
        { option_key: "alerting", requires: ["error_tracking"], suggestion: "Alerts trigger based on error thresholds" },
        { option_key: "viewer_engagement", requires: ["playback_metrics"], suggestion: "Engagement scoring uses playback data" },
        { option_key: "export_csv", requires: ["playback_metrics"], suggestion: "CSV export needs collected metric data" },
      ],
      states: {
        disabled: { ENABLE: "collecting" },
        collecting: { ANALYZE: "reporting", DISABLE: "disabled" },
        reporting: { PAUSE: "collecting" },
      },
    },
    // 10. Ad Insertion Module
    {
      id: "ad_insertion",
      name: "Ad Insertion (SSAI/CSAI)",
      initial: "disabled",
      groups: [
        {
          id: 100,
          name: "Ad Types",
          options: [
            { id: 1000, key: "preroll", name: "Pre-roll Ads", editable: true, included: false },
            { id: 1001, key: "midroll", name: "Mid-roll Ads", editable: true, included: false },
            { id: 1002, key: "overlay_ad", name: "Overlay Ads", editable: true, included: false },
            { id: 1003, key: "companion_ad", name: "Companion Ads", editable: true, included: false },
          ],
        },
        {
          id: 101,
          name: "Ad Tech",
          options: [
            { id: 1010, key: "vast", name: "VAST Tags", editable: true, included: false },
            { id: 1011, key: "vmap", name: "VMAP Playlists", editable: true, included: false },
            { id: 1012, key: "ssai", name: "Server-Side Insertion", editable: true, included: false },
            { id: 1013, key: "csai", name: "Client-Side Insertion", editable: true, included: false },
          ],
        },
      ],
      rules: [
        { option_key: "preroll", requires: ["vast"], suggestion: "Pre-roll ads require VAST tag integration" },
        { option_key: "midroll", requires: ["vast", "vmap"], suggestion: "Mid-roll timing defined in VMAP playlists" },
        { option_key: "ssai", conflicts: ["csai"], suggestion: "Server-side and client-side insertion are mutually exclusive" },
        { option_key: "companion_ad", requires: ["preroll"], suggestion: "Companion ads display alongside pre-roll" },
        { option_key: "overlay_ad", requires: ["csai"], suggestion: "Overlay ads need client-side rendering" },
      ],
      states: {
        disabled: { ENABLE: "ready" },
        ready: { AD_REQUEST: "requesting" },
        requesting: { AD_LOADED: "playing_ad", NO_FILL: "ready" },
        playing_ad: { AD_COMPLETE: "ready", AD_SKIP: "ready" },
      },
    },
  ],
};
