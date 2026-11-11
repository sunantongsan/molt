package com.sunantongsan.molt;

import android.content.Context;
import android.content.res.AssetManager;

import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;

/**
 * Over-the-air patches for the web game, so new builds of the game reach players without a new APK.
 *
 * GitHub Pages hosts the latest web/ folder plus manifest.json = {version, files: {path: sha1}}.
 * The APK carries its own manifest.json in assets. On start we fetch the remote manifest; if its
 * version is newer, files whose hash changed are downloaded, unchanged ones are copied from the
 * current copy, all into a fresh folder that replaces the old one only when everything succeeded.
 */
final class Patcher {
    static final String BASE = "https://sunantongsan.github.io/molt/";

    interface Listener { void onPatched(int version); }

    static File liveDir(Context c) { return new File(c.getFilesDir(), "web"); }

    /** Version of the game the app should load: the downloaded patch if it is newer than the APK's own copy. */
    static int bundledVersion(Context c) {
        try { return readManifest(c.getAssets().open("manifest.json")).optInt("version", 0); } catch (Exception e) { return 0; }
    }
    static int liveVersion(Context c) {
        File m = new File(liveDir(c), "manifest.json");
        if (!m.exists() || !new File(liveDir(c), "index.html").exists()) return -1;
        try { return readManifest(new FileInputStream(m)).optInt("version", -1); } catch (Exception e) { return -1; }
    }
    /** URL the WebView should open. */
    static String startUrl(Context c) {
        return liveVersion(c) > bundledVersion(c)
                ? "file://" + new File(liveDir(c), "index.html").getAbsolutePath()
                : "file:///android_asset/index.html";
    }

    /** Runs on a background thread. Calls back only when a newer patch is fully downloaded. */
    static void check(Context ctx, Listener done) {
        try {
            JSONObject remote = new JSONObject(new String(get(BASE + "manifest.json?t=" + System.currentTimeMillis()), StandardCharsets.UTF_8));
            int rv = remote.optInt("version", 0);
            int cur = Math.max(bundledVersion(ctx), liveVersion(ctx));
            if (rv <= cur) return;

            boolean fromLive = liveVersion(ctx) > bundledVersion(ctx);
            JSONObject curFiles;
            if (fromLive) curFiles = readManifest(new FileInputStream(new File(liveDir(ctx), "manifest.json"))).optJSONObject("files");
            else curFiles = readManifest(ctx.getAssets().open("manifest.json")).optJSONObject("files");
            if (curFiles == null) curFiles = new JSONObject();

            File tmp = new File(ctx.getFilesDir(), "web_new");
            deleteAll(tmp);
            JSONObject files = remote.getJSONObject("files");
            AssetManager am = ctx.getAssets();
            for (Iterator<String> it = files.keys(); it.hasNext(); ) {
                String path = it.next();
                if (path.contains("..")) continue;
                File out = new File(tmp, path);
                //noinspection ResultOfMethodCallIgnored
                out.getParentFile().mkdirs();
                String want = files.getString(path);
                if (want.equals(curFiles.optString(path, ""))) {
                    // unchanged: copy what we already have
                    try (InputStream in = fromLive ? new FileInputStream(new File(liveDir(ctx), path)) : am.open(path)) { copy(in, out); continue; }
                    catch (IOException ignored) { /* fall through and download */ }
                }
                byte[] data = get(BASE + path + "?v=" + rv);
                try (OutputStream o = new FileOutputStream(out)) { o.write(data); }
            }
            try (OutputStream o = new FileOutputStream(new File(tmp, "manifest.json"))) { o.write(remote.toString().getBytes(StandardCharsets.UTF_8)); }

            // swap in the new copy
            File live = liveDir(ctx), old = new File(ctx.getFilesDir(), "web_old");
            deleteAll(old);
            if (live.exists() && !live.renameTo(old)) deleteAll(live);
            if (!tmp.renameTo(live)) return;
            deleteAll(old);
            done.onPatched(rv);
        } catch (Exception ignored) {
            // offline or no patch hosted yet: just keep playing what we have
        }
    }

    private static byte[] get(String url) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(8000); c.setReadTimeout(20000); c.setUseCaches(false);
        try {
            if (c.getResponseCode() != 200) throw new IOException("HTTP " + c.getResponseCode() + " " + url);
            try (InputStream in = c.getInputStream()) { return readAll(in); }
        } finally { c.disconnect(); }
    }
    private static JSONObject readManifest(InputStream in) throws Exception {
        try (InputStream i = in) { return new JSONObject(new String(readAll(i), StandardCharsets.UTF_8)); }
    }
    private static byte[] readAll(InputStream in) throws IOException {
        java.io.ByteArrayOutputStream b = new java.io.ByteArrayOutputStream();
        byte[] buf = new byte[16384]; int n;
        while ((n = in.read(buf)) > 0) b.write(buf, 0, n);
        return b.toByteArray();
    }
    private static void copy(InputStream in, File out) throws IOException {
        try (OutputStream o = new FileOutputStream(out)) { byte[] buf = new byte[16384]; int n; while ((n = in.read(buf)) > 0) o.write(buf, 0, n); }
    }
    private static void deleteAll(File f) {
        if (f == null || !f.exists()) return;
        File[] kids = f.listFiles();
        if (kids != null) for (File k : kids) deleteAll(k);
        //noinspection ResultOfMethodCallIgnored
        f.delete();
    }
}
