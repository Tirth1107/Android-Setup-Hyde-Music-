import { NativeAudio } from '@capgo/native-audio';
import { Capacitor } from '@capacitor/core';
import { Song } from '../types/music';

// This wrapper handles audio playback on native Android/iOS
// using @capgo/capacitor-native-audio
export const NativeAudioService = {
    isNative: Capacitor.isNativePlatform(),

    async initialize() {
        if (!this.isNative) return;
        try {
            await NativeAudio.configure({
                focus: true,
                background: true,
                showNotification: true,
                fade: true
            });
        } catch (e) {
            console.error("Native Audio Init Error:", e);
        }
    },

    async play(song: Song, audioUrl: string) {
        if (!this.isNative) return;

        try {
            const assetId = 'currentSong';

            // Unload previous if exists
            try {
                await NativeAudio.unload({ assetId });
            } catch (e) { /* Ignore */ }

            // Preload with metadata for notification
            await NativeAudio.preload({
                assetId: assetId,
                assetPath: audioUrl,
                audioChannelNum: 1,
                isUrl: true,
                notificationMetadata: {
                    title: song.title,
                    artist: song.artist,
                    album: (song as any).album || 'Single',
                    artworkUrl: song.coverUrl || song.image
                }
            });

            await NativeAudio.play({
                assetId: assetId,
            });

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
