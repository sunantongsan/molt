package com.sunantongsan.molt;

import android.app.Activity;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.annotation.NonNull;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;

/** Rewarded ads for the game. JS calls AndroidAds.showRewarded(); the result comes back via window.__adDone(true|false). */
public class MoltAds {
    private final Activity activity;
    private final WebView web;
    private RewardedAd ready;
    private boolean loading;
    private boolean earned;

    MoltAds(Activity activity, WebView web) {
        this.activity = activity;
        this.web = web;
        new Thread(() -> MobileAds.initialize(activity, status -> activity.runOnUiThread(this::load))).start();
    }

    private void load() {
        if (loading || ready != null) return;
        loading = true;
        RewardedAd.load(activity, BuildConfig.ADMOB_REWARDED, new AdRequest.Builder().build(), new RewardedAdLoadCallback() {
            @Override public void onAdLoaded(@NonNull RewardedAd ad) { loading = false; ready = ad; }
            @Override public void onAdFailedToLoad(@NonNull LoadAdError e) {
                loading = false;
                web.postDelayed(MoltAds.this::load, 30000);
            }
        });
    }

    private void done(boolean ok) {
        web.post(() -> web.evaluateJavascript("window.__adDone && window.__adDone(" + ok + ")", null));
    }

    /** Returns true when an ad is being shown; false means "no ad available" so the web side can fall back. */
    @JavascriptInterface
    public boolean showRewarded() {
        if (ready == null) { activity.runOnUiThread(this::load); return false; }
        final RewardedAd ad = ready;
        ready = null;
        earned = false;
        activity.runOnUiThread(() -> {
            ad.setFullScreenContentCallback(new FullScreenContentCallback() {
                @Override public void onAdDismissedFullScreenContent() { done(earned); load(); }
                @Override public void onAdFailedToShowFullScreenContent(@NonNull AdError e) { done(false); load(); }
            });
            ad.show(activity, reward -> earned = true);
        });
        return true;
    }

    @JavascriptInterface
    public boolean isReady() { return ready != null; }
}
