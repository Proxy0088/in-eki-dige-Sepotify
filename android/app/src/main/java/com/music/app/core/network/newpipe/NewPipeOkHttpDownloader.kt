package com.music.app.core.network.newpipe

import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.ResponseBody
import org.schabi.newpipe.extractor.downloader.Downloader
import org.schabi.newpipe.extractor.downloader.Request
import org.schabi.newpipe.extractor.downloader.Response
import org.schabi.newpipe.extractor.exceptions.ReCaptchaException
import java.io.IOException
import java.net.InetAddress
import java.util.concurrent.TimeUnit

class NewPipeOkHttpDownloader private constructor(
    private val client: OkHttpClient
) : Downloader() {

    companion object {
        @Volatile
        private var instance: NewPipeOkHttpDownloader? = null

        /**
         * Custom DNS resolver that tries the system resolver first,
         * then falls back to Cloudflare (1.1.1.1) and Google (8.8.8.8) DoH-style
         * hardcoded IPs to work around broken VPN DNS configurations.
         */
        private val reliableDns = object : okhttp3.Dns {
            override fun lookup(hostname: String): List<InetAddress> {
                try {
                    val systemResult = okhttp3.Dns.SYSTEM.lookup(hostname)
                    if (systemResult.isNotEmpty()) return systemResult
                } catch (_: Exception) {}

                // Fallback: resolve via Google Public DNS over HTTPS (DoH JSON API)
                try {
                    val url = "https://dns.google/resolve?name=$hostname&type=A"
                    val req = okhttp3.Request.Builder().url(url)
                        .header("Accept", "application/dns-json")
                        .build()
                    val fallbackClient = OkHttpClient.Builder()
                        .connectTimeout(5, TimeUnit.SECONDS)
                        .readTimeout(5, TimeUnit.SECONDS)
                        .build()
                    val resp = fallbackClient.newCall(req).execute()
                    val body = resp.body?.string() ?: ""
                    resp.close()
                    val json = org.json.JSONObject(body)
                    val answers = json.optJSONArray("Answer")
                    if (answers != null && answers.length() > 0) {
                        val ips = mutableListOf<InetAddress>()
                        for (i in 0 until answers.length()) {
                            val data = answers.optJSONObject(i)?.optString("data") ?: continue
                            try { ips.add(InetAddress.getByName(data)) } catch (_: Exception) {}
                        }
                        if (ips.isNotEmpty()) return ips
                    }
                } catch (_: Exception) {}

                // Last resort
                return InetAddress.getAllByName(hostname).toList()
            }
        }

        fun getInstance(): NewPipeOkHttpDownloader {
            return instance ?: synchronized(this) {
                instance ?: NewPipeOkHttpDownloader(
                    OkHttpClient.Builder()
                        .dns(reliableDns)
                        .connectTimeout(20, TimeUnit.SECONDS)
                        .readTimeout(25, TimeUnit.SECONDS)
                        .followRedirects(true)
                        .followSslRedirects(true)
                        .retryOnConnectionFailure(true)
                        .build()
                ).also { instance = it }
            }
        }
    }

    @Throws(IOException::class, ReCaptchaException::class)
    override fun execute(request: Request): Response {
        val httpMethod = request.httpMethod()
        val url = request.url()
        val headers = request.headers()
        val dataToSend = request.dataToSend()

        val requestBuilder = okhttp3.Request.Builder()
            .url(url)

        // Transfer headers
        headers?.forEach { (name, values) ->
            values.forEach { value ->
                requestBuilder.addHeader(name, value)
            }
        }

        // Set User-Agent if not present
        if (headers == null || !headers.containsKey("User-Agent")) {
            requestBuilder.header(
                "User-Agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
        }

        val requestBody = if (dataToSend != null) {
            val contentType = headers?.get("Content-Type")?.firstOrNull()?.toMediaTypeOrNull()
            dataToSend.toRequestBody(contentType)
        } else if (httpMethod.equals("POST", ignoreCase = true)) {
            ByteArray(0).toRequestBody(null)
        } else {
            null
        }

        requestBuilder.method(httpMethod, requestBody)

        val response = client.newCall(requestBuilder.build()).execute()
        android.util.Log.d("NewPipeDownloader", "HTTP ${response.code} for $url")

        if (response.code == 429) {
            response.close()
            throw ReCaptchaException("reCaptcha Challenge requested", url)
        }

        val responseBody: ResponseBody? = response.body
        val responseBodyString = responseBody?.string() ?: ""
        val latestUrl = response.request.url.toString()

        return Response(
            response.code,
            response.message,
            response.headers.toMultimap(),
            responseBodyString,
            latestUrl
        )
    }
}
