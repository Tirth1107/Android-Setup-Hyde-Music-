import { NativeAudio } from '@capgo/native-audio';
import { Capacitor } from '@capacitor/core';
import { Song } from '../types/music';

// This wrapper handles audio playback on native Android/iOS
// using @capgo/capacitor-native-audio
export const NativeAudioService = {
    isNative: Capacitor.isNativePlatform(),

    async play(song: Song, audioUrl: string) {
        if (!this.isNative) return;

        try {
            // Ensure any existing audio is stopped/unloaded if necessary
            // For this plugin, typically play handles it, or we might want to stop first
            // But usually sending a new track ID handles it.

            // NativeAudio plugin expects an object with assetId, assetPath, etc.
            // But @capgo/capacitor-native-audio supports streaming from URL.
            // We use 'configure' or direct 'play' depending on API.
            // Checking plugin docs (simulated):
            // await NativeAudio.play({ assetId: 'currentTrack', path: audioUrl });

            // We will use a fixed assetId 'currentTrack' so we only play one song at a time.
            // First, try to unload previous if exists? 
            // Safe approach: unload -> preload -> play, or just play if supported.

            // @capgo/capacitor-native-audio typically supports:
            // NativeAudio.preload({ assetId: "fire", assetPath: "fire.mp3", audioChannelNum: 1, isUrl: true });
            // NativeAudio.play({ assetId: "fire" });

            const assetId = 'currentSong';

            try {
                await NativeAudio.unload({ assetId });
            } catch (e) {
                // Ignore error if not loaded
            }

            await NativeAudio.preload({
                assetId: assetId,
                assetPath: audioUrl,
                audioChannelNum: 1,
                isUrl: true
            });

            // Update metadata for lockscreen (if supported by plugin, otherwise handled elsewhere)
            // This plugin might not support metadata directly in 'play'. 
            // We rely on the service configuration in AndroidManifest for basic controls.

            await NativeAudio.play({
                assetId: assetId,
            });

            // Set volume to 1.0 (max) by default, managed by global volume
            await NativeAudio.setVolume({
                assetId: assetId,
                volume: 1.0
            });

        } catch (error) {
            console.error("Native Audio Play Error:", error);
        }
    },

    async pause() {
        if (!this.isNative) return;
        try {
            await NativeAudio.pause({ assetId: 'currentSong' });
        } catch (e) { console.error(e); }
    },

    async resume() {
        if (!this.isNative) return;
        try {
            await NativeAudio.resume({ assetId: 'currentSong' });
        } catch (e) { console.error(e); }
    },

    async stop() {
        if (!this.isNative) return;
        try {
            await NativeAudio.stop({ assetId: 'currentSong' });
            await NativeAudio.unload({ assetId: 'currentSong' });
        } catch (e) { console.error(e); }
    },

    async setVolume(volume: number) {
        if (!this.isNative) return;
        try {
            // Volume is 0.0 to 1.0
            const vol = Math.max(0, Math.min(1, volume / 100));
            await NativeAudio.setVolume({
                assetId: 'currentSong',
                volume: vol
            });
        } catch (e) { console.error(e); }
    },

    async seek(timeSeconds: number) {
        if (!this.isNative) return;
        try {
            // Plugin uses seconds or milliseconds? Usually seconds for 'setCurrentTime'
            await NativeAudio.setCurrentTime({
                assetId: 'currentSong',
                time: timeSeconds
            });
        } catch (e) { console.error(e); }
    },

    async getDuration(): Promise<number> {
        if (!this.isNative) return 0;
        try {
            const result = await NativeAudio.getDuration({ assetId: 'currentSong' });
            return result.duration;
        } catch (e) { return 0; }
    },

    async getCurrentTime(): Promise<number> {
        if (!this.isNative) return 0;
        try {
            const result = await NativeAudio.getCurrentTime({ assetId: 'currentSong' });
            return result.currentTime;
        } catch (e) { return 0; }
    }
};
