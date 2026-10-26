package za.nikeelnaidoo.satriviashowdown.tv;

import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final String GAME_URL = "https://nikeelnaidoo5518.github.io/sa-trivia-showdown/?tv=1";
    private static final String GAME_ORIGIN = "https://nikeelnaidoo5518.github.io/sa-trivia-showdown/";
    private static final int NAVY = Color.rgb(27, 11, 51);
    private static final int CREAM = Color.rgb(251, 247, 255);
    private static final int GOLD = Color.rgb(255, 214, 74);

    private FrameLayout root;
    private WebView webView;
    private View loadingScreen;
    private View errorScreen;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setImmersiveMode();
        buildScreen();
        configureWebView();
        webView.loadUrl(GAME_URL);
    }

    private void buildScreen() {
        root = new FrameLayout(this);
        root.setBackgroundColor(NAVY);

        webView = new WebView(this);
        webView.setBackgroundColor(NAVY);
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));

        loadingScreen = makeMessageScreen("SA Trivia Showdown", "Getting the game show ready…", true);
        root.addView(loadingScreen, new FrameLayout.LayoutParams(-1, -1));

        errorScreen = makeMessageScreen("The game could not connect", "Check that your TV is online, then try again. Your phone players can still use their browsers to join once the TV reconnects.", false);
        errorScreen.setVisibility(View.GONE);
        root.addView(errorScreen, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
    }

    private View makeMessageScreen(String title, String message, boolean loading) {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(40, 28, 40, 28);
        panel.setBackgroundColor(NAVY);

        TextView heading = new TextView(this);
        heading.setText(title);
        heading.setTextColor(GOLD);
        heading.setTextSize(loading ? 32 : 30);
        heading.setTypeface(Typeface.create("sans-serif", Typeface.BOLD));
        heading.setGravity(Gravity.CENTER);
        panel.addView(heading);

        TextView copy = new TextView(this);
        copy.setText(message);
        copy.setTextColor(CREAM);
        copy.setTextSize(loading ? 20 : 18);
        copy.setGravity(Gravity.CENTER);
        copy.setMaxWidth(760);
        LinearLayout.LayoutParams copyParams = new LinearLayout.LayoutParams(-2, -2);
        copyParams.setMargins(0, 14, 0, 0);
        panel.addView(copy, copyParams);

        if (loading) {
            ProgressBar spinner = new ProgressBar(this);
            spinner.setIndeterminate(true);
            if (Build.VERSION.SDK_INT >= 21) spinner.setIndeterminateTintList(android.content.res.ColorStateList.valueOf(GOLD));
            LinearLayout.LayoutParams spinnerParams = new LinearLayout.LayoutParams(56, 56);
            spinnerParams.setMargins(0, 24, 0, 0);
            panel.addView(spinner, spinnerParams);
        } else {
            Button retry = new Button(this);
            retry.setText("Try again");
            retry.setTextColor(NAVY);
            retry.setTextSize(18);
            retry.setAllCaps(false);
            retry.setTypeface(Typeface.create("sans-serif", Typeface.BOLD));
            retry.setBackground(rounded(GOLD, 14));
            retry.setFocusable(true);
            retry.setOnClickListener(view -> {
                showLoading();
                webView.loadUrl(GAME_URL);
            });
            LinearLayout.LayoutParams retryParams = new LinearLayout.LayoutParams(220, 60);
            retryParams.setMargins(0, 28, 0, 0);
            panel.addView(retry, retryParams);
            retry.setOnFocusChangeListener((view, focused) -> view.setScaleX(focused ? 1.06f : 1f));
        }
        return panel;
    }

    private GradientDrawable rounded(int color, int radiusDp) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadius(radiusDp * getResources().getDisplayMetrics().density);
        return drawable;
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        if (Build.VERSION.SDK_INT >= 26) settings.setSafeBrowsingEnabled(true);

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !request.getUrl().toString().startsWith(GAME_ORIGIN);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return !url.startsWith(GAME_ORIGIN);
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                showLoading();
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                loadingScreen.setVisibility(View.GONE);
                errorScreen.setVisibility(View.GONE);
                webView.setVisibility(View.VISIBLE);
                webView.requestFocus();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (Build.VERSION.SDK_INT >= 23 && request.isForMainFrame()) showError();
            }

            @SuppressWarnings("deprecation")
            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                if (Build.VERSION.SDK_INT < 23 && failingUrl != null && failingUrl.startsWith(GAME_ORIGIN)) showError();
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, android.webkit.WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 500) showError();
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel();
                showError();
            }
        });
    }

    private void showLoading() {
        errorScreen.setVisibility(View.GONE);
        webView.setVisibility(View.VISIBLE);
        loadingScreen.setVisibility(View.VISIBLE);
    }

    private void showError() {
        loadingScreen.setVisibility(View.GONE);
        webView.setVisibility(View.GONE);
        errorScreen.setVisibility(View.VISIBLE);
        errorScreen.post(() -> {
            if (errorScreen instanceof LinearLayout) {
                View retry = ((LinearLayout) errorScreen).getChildAt(2);
                if (retry != null) retry.requestFocus();
            }
        });
    }

    private void setImmersiveMode() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        );
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) setImmersiveMode();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        AlertDialog dialog = new AlertDialog.Builder(this)
            .setTitle("Leave SA Trivia Showdown?")
            .setMessage("The room will stay open for your phone players.")
            .setNegativeButton("Stay", (d, which) -> d.dismiss())
            .setPositiveButton("Exit game", (d, which) -> finish())
            .create();
        dialog.setOnShowListener(ignored -> dialog.getButton(AlertDialog.BUTTON_NEGATIVE).requestFocus());
        dialog.show();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
        }
        super.onDestroy();
    }
}
