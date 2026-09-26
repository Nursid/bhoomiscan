package com.destinyprotocol

import android.content.ContentValues
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

class ReportDownloaderModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "ReportDownloader"

  @ReactMethod
  fun downloadFile(url: String, fileName: String, promise: Promise) {
    Thread {
      try {
        val safeFileName = sanitizeFileName(fileName.ifBlank { "destiny-property-report.pdf" })
        val connection = (URL(url).openConnection() as HttpURLConnection).apply {
          connectTimeout = 20000
          readTimeout = 30000
          requestMethod = "GET"
          setRequestProperty("Accept", "application/pdf")
          setRequestProperty("User-Agent", "DestinyProtocolAndroid/1.0")
        }

        val status = connection.responseCode
        if (status !in 200..299) {
          val errorText = connection.errorStream?.bufferedReader()?.use { it.readText() }.orEmpty()
          throw IllegalStateException("Report server returned HTTP $status. ${errorText.take(160)}")
        }

        val contentType = connection.contentType.orEmpty().lowercase()
        if (!contentType.contains("pdf")) {
          throw IllegalStateException("Report server did not return a PDF. Content-Type: ${connection.contentType}")
        }

        val savedUri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          saveWithMediaStore(safeFileName, connection)
        } else {
          saveLegacy(safeFileName, connection)
        }

        connection.disconnect()
        promise.resolve(savedUri)
      } catch (error: Exception) {
        promise.reject("REPORT_DOWNLOAD_FAILED", error.message, error)
      }
    }.start()
  }

  private fun saveWithMediaStore(fileName: String, connection: HttpURLConnection): String {
    val resolver = reactContext.contentResolver
    val values = ContentValues().apply {
      put(MediaStore.Downloads.DISPLAY_NAME, fileName)
      put(MediaStore.Downloads.MIME_TYPE, "application/pdf")
      put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
      put(MediaStore.Downloads.IS_PENDING, 1)
    }

    val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
      ?: throw IllegalStateException("Could not create Downloads file.")

    resolver.openOutputStream(uri)?.use { output ->
      connection.inputStream.use { input -> input.copyTo(output) }
    } ?: throw IllegalStateException("Could not open Downloads file.")

    values.clear()
    values.put(MediaStore.Downloads.IS_PENDING, 0)
    resolver.update(uri, values, null, null)
    return uri.toString()
  }

  private fun saveLegacy(fileName: String, connection: HttpURLConnection): String {
    val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
    if (!downloadsDir.exists()) downloadsDir.mkdirs()
    val file = File(downloadsDir, fileName)
    FileOutputStream(file).use { output ->
      connection.inputStream.use { input -> input.copyTo(output) }
    }
    return file.absolutePath
  }

  private fun sanitizeFileName(fileName: String): String =
    fileName.replace(Regex("[^A-Za-z0-9._-]"), "-").let {
      if (it.endsWith(".pdf", ignoreCase = true)) it else "$it.pdf"
    }
}
