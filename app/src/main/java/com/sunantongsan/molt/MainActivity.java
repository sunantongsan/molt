package com.sunantongsan.molt;

import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.content.Intent;
import android.net.Uri;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.webkit.WebView;

public class MainActivity extends Activity {
    private WebView web;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);           // keeps coins and upgrades
        s.setTextZoom(100);                     // ignore the phone's large-font setting so menus fit
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(true);             // patched game files live in the app's own folder
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setBackgroundColor(0xFF1D5FA8);
        setContentView(web);
        // if the game page ever runs out of memory, Android kills its renderer; without this the whole app
        // closed ("kicked out of the game"). Now the game simply reopens; coins and progress are in local storage.
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                ViewGroup parent = (ViewGroup) view.getParent();
                if (parent != null) parent.removeView(view);
                view.destroy();
                if (view == web) { web = null; recreate(); }
                return true;
            }
            @SuppressWarnings("deprecation")
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url != null && (url.startsWith("http://") || url.startsWith("https://"))) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception ignored) {}
                    return true;
                }
                return false;
            }
        });
        web.addJavascriptInterface(new MoltAds(this, web), "AndroidAds");
        hideBars();
        web.addJavascriptInterface(new PatchBridge(), "AndroidPatch");
        web.loadUrl(Patcher.startUrl(this));
        // look for a newer game patch in the background; tell the game when one is ready
        new Thread(() -> Patcher.check(getApplicationContext(), v -> runOnUiThread(() -> {
            if (!isFinishing() && web != null) web.evaluateJavascript("window.onMoltPatch && window.onMoltPatch(" + v + ")", null);
        })), "molt-patch").start();
    }

    /** Lets the game show its version and restart into a freshly downloaded patch. */
    private class PatchBridge {
        @JavascriptInterface public int version() { return Math.max(Patcher.bundledVersion(MainActivity.this), Patcher.liveVersion(MainActivity.this)); }
        @JavascriptInterface public String state() { return Patcher.stateJson(); }
        @JavascriptInterface public void reload() { runOnUiThread(() -> { if (web != null) web.loadUrl(Patcher.startUrl(MainActivity.this)); }); }
    }

    private void hideBars() {
        if (web == null) return;
        web.setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideBars();
    }

    @Override protected void onPause() { super.onPause(); if (web != null) web.onPause(); }
    @Override protected void onResume() { super.onResume(); if (web != null) web.onResume(); }
}
