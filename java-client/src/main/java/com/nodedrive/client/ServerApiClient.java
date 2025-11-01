package com.nodedrive.client;

import com.google.gson.Gson;
import okhttp3.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * HTTP client for communicating with the Node Drive server.
 * Port of ServerApiClient.ts from Node.js client.
 */
public class ServerApiClient {

    private final String baseUrl;
    private final OkHttpClient httpClient;
    private final Gson gson;

    public static class Config {
        public String baseUrl = "http://localhost:3000";
        public int timeout = 5000;
        public int retryAttempts = 1;
        public int retryDelay = 100;

        public Config() {
        }

        public Config(String baseUrl, int timeout, int retryAttempts, int retryDelay) {
            this.baseUrl = baseUrl;
            this.timeout = timeout;
            this.retryAttempts = retryAttempts;
            this.retryDelay = retryDelay;
        }
    }

    public static class FileUploadRequest {
        public String username;
        public String deviceId;
        public byte[] file;
        public String fileName;
        public long fileSize;
        public long lastModified;
        public String checksum;

        @Override
        public String toString() {
            return String.format("FileUploadRequest{fileName=%s, size=%d, checksum=%s}",
                    fileName, fileSize, checksum);
        }
    }

    public ServerApiClient(Config config) {
        this.baseUrl = config.baseUrl;
        this.gson = new Gson();

        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(config.timeout, TimeUnit.MILLISECONDS)
                .readTimeout(config.timeout, TimeUnit.MILLISECONDS)
                .writeTimeout(config.timeout, TimeUnit.MILLISECONDS)
                .retryOnConnectionFailure(true)
                .build();

        AppLog.info("ServerApiClient", "Initialized with baseUrl: " + baseUrl);
    }

    /**
     * Upload a file to the server
     */
    public void uploadFile(FileUploadRequest request) {
        AppLog.info("ServerApiClient", "Uploading file: " + request);

        try {
            // Create multipart request body
            MultipartBody.Builder bodyBuilder = new MultipartBody.Builder()
                    .setType(MultipartBody.FORM)
                    .addFormDataPart("username", request.username)
                    .addFormDataPart("deviceId", request.deviceId)
                    .addFormDataPart("fileName", request.fileName)
                    .addFormDataPart("fileSize", String.valueOf(request.fileSize))
                    .addFormDataPart("lastModified", String.valueOf(request.lastModified))
                    .addFormDataPart("checksum", request.checksum);

            // Add file data
            if (request.file != null) {
                RequestBody fileBody = RequestBody.create(
                        request.file,
                        MediaType.parse("application/octet-stream")
                );
                bodyBuilder.addFormDataPart("file", request.fileName, fileBody);
            }

            RequestBody body = bodyBuilder.build();

            // Build request
            Request httpRequest = new Request.Builder()
                    .url(baseUrl + "/api/upload")
                    .post(body)
                    .build();

            // Execute request
            try (Response response = httpClient.newCall(httpRequest).execute()) {
                if (response.isSuccessful()) {
                    String responseBody = response.body() != null ? response.body().string() : "";
                    AppLog.info("ServerApiClient", "Upload successful: " + responseBody);
                } else {
                    AppLog.error("ServerApiClient", "Upload failed: " + response.code() + " - " + response.message());
                }
            }

        } catch (IOException e) {
            AppLog.error("ServerApiClient", "Upload error: " + e.getMessage());
        }
    }

    /**
     * Check server connectivity
     */
    public boolean ping() {
        try {
            Request request = new Request.Builder()
                    .url(baseUrl + "/api/ping")
                    .get()
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                return response.isSuccessful();
            }
        } catch (IOException e) {
            AppLog.error("ServerApiClient", "Ping failed: " + e.getMessage());
            return false;
        }
    }

    /**
     * Get server status
     */
    public Map<String, Object> getStatus() {
        try {
            Request request = new Request.Builder()
                    .url(baseUrl + "/api/status")
                    .get()
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                if (response.isSuccessful() && response.body() != null) {
                    String json = response.body().string();
                    @SuppressWarnings("unchecked")
                    Map<String, Object> status = gson.fromJson(json, Map.class);
                    return status;
                }
            }
        } catch (IOException e) {
            AppLog.error("ServerApiClient", "Get status failed: " + e.getMessage());
        }

        return new HashMap<>();
    }
}
