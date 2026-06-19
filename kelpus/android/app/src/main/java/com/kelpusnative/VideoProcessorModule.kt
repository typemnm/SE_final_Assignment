package com.kelpusnative

import android.content.Intent
import android.graphics.Bitmap
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.media.MediaMuxer
import android.os.Environment
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import java.io.ByteArrayOutputStream
import java.io.File
import java.nio.ByteBuffer

class VideoProcessorModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "VideoProcessor"

    /**
     * 여러 5초 클립을 하나의 영상으로 합치고 배속 처리합니다.
     * clips: [{uri: String, text: String}]
     * speedFactor: 재생 배속 (예: 2.0 = 2배속)
     */
    @ReactMethod
    fun combineClips(clips: ReadableArray, speedFactor: Double, promise: Promise) {
        Thread {
            try {
                val outputPath = buildOutputPath()
                val result = mergeClips(clips, outputPath, speedFactor)
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("COMBINE_ERROR", e.message ?: "영상 합치기 실패", e)
            }
        }.start()
    }

    /**
     * 영상에서 첫 번째 프레임을 추출해 썸네일 파일 경로를 반환합니다.
     */
    @ReactMethod
    fun getThumbnail(videoUri: String, promise: Promise) {
        Thread {
            try {
                val filePath = uriToPath(videoUri)
                val retriever = MediaMetadataRetriever()
                retriever.setDataSource(filePath)
                val bitmap = retriever.getFrameAtTime(0, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
                retriever.release()

                if (bitmap == null) {
                    promise.resolve(null)
                    return@Thread
                }

                val scaled = Bitmap.createScaledBitmap(bitmap, 180, 180, true)
                val baos = ByteArrayOutputStream()
                scaled.compress(Bitmap.CompressFormat.JPEG, 75, baos)

                val cacheDir = reactContext.cacheDir
                val thumbFile = File(cacheDir, "kelpus_thumb_${System.currentTimeMillis()}.jpg")
                thumbFile.writeBytes(baos.toByteArray())

                promise.resolve("file://${thumbFile.absolutePath}")
            } catch (e: Exception) {
                promise.resolve(null)
            }
        }.start()
    }

    /**
     * 저장된 영상 파일을 시스템 미디어 플레이어로 엽니다.
     */
    @ReactMethod
    fun openVideo(uri: String, promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Activity를 찾을 수 없습니다")
            return
        }
        try {
            val file = File(uriToPath(uri))
            val contentUri = FileProvider.getUriForFile(
                reactContext,
                "${reactContext.packageName}.fileprovider",
                file,
            )
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(contentUri, "video/mp4")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            activity.startActivity(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("OPEN_ERROR", e.message ?: "영상 열기 실패", e)
        }
    }

    /**
     * 저장된 영상 파일을 다른 앱으로 공유합니다 (실제 파일 공유).
     */
    @ReactMethod
    fun shareVideo(uri: String, promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Activity를 찾을 수 없습니다")
            return
        }
        try {
            val file = File(uriToPath(uri))
            val contentUri = FileProvider.getUriForFile(
                reactContext,
                "${reactContext.packageName}.fileprovider",
                file,
            )
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "video/mp4"
                putExtra(Intent.EXTRA_STREAM, contentUri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            val chooser = Intent.createChooser(intent, "영상 공유")
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            activity.startActivity(chooser)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("SHARE_ERROR", e.message ?: "영상 공유 실패", e)
        }
    }

    private fun buildOutputPath(): String {
        val dir = reactContext.getExternalFilesDir(Environment.DIRECTORY_MOVIES)
            ?: reactContext.filesDir
        dir.mkdirs()
        return File(dir, "kelpus_${System.currentTimeMillis()}.mp4").absolutePath
    }

    private fun uriToPath(uri: String): String =
        if (uri.startsWith("file://")) uri.removePrefix("file://") else uri

    private fun mergeClips(clips: ReadableArray, outputPath: String, speedFactor: Double): String {
        if (clips.size() == 0) throw IllegalArgumentException("클립이 없습니다")
        val safeSpeed = if (speedFactor <= 0.0) 1.0 else speedFactor

        val muxer = MediaMuxer(outputPath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
        var muxerStarted = false
        var videoMuxTrack = -1
        var audioMuxTrack = -1
        var baseTimeUs = 0L

        // 2 MB 읽기 버퍼
        val buffer = ByteBuffer.allocate(2 * 1024 * 1024)
        val bufferInfo = MediaCodec.BufferInfo()

        try {
            for (i in 0 until clips.size()) {
                val clip = clips.getMap(i) ?: continue
                val uri = clip.getString("uri") ?: continue
                val filePath = uriToPath(uri)

                val extractor = MediaExtractor()
                extractor.setDataSource(filePath)

                val videoTrack = findTrack(extractor, "video/")
                val audioTrack = findTrack(extractor, "audio/")

                // 첫 번째 클립의 트랙 포맷으로 Muxer 설정
                if (!muxerStarted) {
                    if (videoTrack >= 0) {
                        videoMuxTrack = muxer.addTrack(extractor.getTrackFormat(videoTrack))
                    }
                    if (audioTrack >= 0) {
                        audioMuxTrack = muxer.addTrack(extractor.getTrackFormat(audioTrack))
                    }
                    // 입력 영상의 회전 메타데이터를 출력에 그대로 적용 (세로 영상 보존)
                    val retriever = MediaMetadataRetriever()
                    try {
                        retriever.setDataSource(filePath)
                        val rotation = retriever.extractMetadata(
                            MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION
                        )?.toIntOrNull() ?: 90
                        muxer.setOrientationHint(rotation)
                    } catch (ignored: Exception) {
                        muxer.setOrientationHint(90)
                    } finally {
                        retriever.release()
                    }
                    muxer.start()
                    muxerStarted = true
                }

                val clipDurationUs = getClipDuration(extractor, videoTrack, audioTrack)

                // 비디오 트랙 복사 (타임스탬프 배속 조정)
                if (videoTrack >= 0 && videoMuxTrack >= 0) {
                    writeSamples(extractor, videoTrack, muxer, videoMuxTrack,
                        buffer, bufferInfo, safeSpeed, baseTimeUs)
                }

                // 오디오 트랙 복사 (타임스탬프 배속 조정)
                if (audioTrack >= 0 && audioMuxTrack >= 0) {
                    writeSamples(extractor, audioTrack, muxer, audioMuxTrack,
                        buffer, bufferInfo, safeSpeed, baseTimeUs)
                }

                baseTimeUs += (clipDurationUs / safeSpeed).toLong() + 1L
                extractor.release()
            }
        } finally {
            if (muxerStarted) {
                try { muxer.stop() } catch (ignored: Exception) {}
            }
            muxer.release()
        }

        return "file://$outputPath"
    }

    private fun findTrack(extractor: MediaExtractor, mimePrefix: String): Int {
        for (t in 0 until extractor.trackCount) {
            val mime = extractor.getTrackFormat(t).getString(MediaFormat.KEY_MIME) ?: continue
            if (mime.startsWith(mimePrefix)) return t
        }
        return -1
    }

    private fun getClipDuration(extractor: MediaExtractor, videoTrack: Int, audioTrack: Int): Long {
        val track = if (videoTrack >= 0) videoTrack else audioTrack
        if (track < 0) return 0L
        val fmt = extractor.getTrackFormat(track)
        return if (fmt.containsKey(MediaFormat.KEY_DURATION)) fmt.getLong(MediaFormat.KEY_DURATION) else 0L
    }

    private fun writeSamples(
        extractor: MediaExtractor,
        srcTrack: Int,
        muxer: MediaMuxer,
        muxTrack: Int,
        buffer: ByteBuffer,
        bufferInfo: MediaCodec.BufferInfo,
        speedFactor: Double,
        baseTimeUs: Long,
    ) {
        extractor.selectTrack(srcTrack)
        extractor.seekTo(0, MediaExtractor.SEEK_TO_CLOSEST_SYNC)

        while (true) {
            buffer.clear()
            val size = extractor.readSampleData(buffer, 0)
            if (size < 0) break

            bufferInfo.size = size
            bufferInfo.offset = 0
            bufferInfo.presentationTimeUs = (extractor.sampleTime / speedFactor).toLong() + baseTimeUs
            bufferInfo.flags = extractor.sampleFlags

            muxer.writeSampleData(muxTrack, buffer, bufferInfo)
            extractor.advance()
        }

        extractor.unselectTrack(srcTrack)
    }
}
