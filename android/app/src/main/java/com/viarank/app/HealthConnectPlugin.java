package com.viarank.app;

import androidx.health.connect.client.HealthConnectClient;
import androidx.health.connect.client.PermissionController;
import androidx.activity.result.ActivityResultLauncher;
import java.util.Set;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.ActivityCallback;
@CapacitorPlugin(name = "HealthConnect")
public class HealthConnectPlugin extends Plugin {
private ActivityResultLauncher<Set<String>> permissionLauncher;
@Override
public void load() {
    permissionLauncher = getActivity().registerForActivityResult(
        PermissionController.createRequestPermissionResultContract(),
        granted -> {
        }
    );
}
@PluginMethod
public void requestHealthPermissions(PluginCall call) {
    Set<String> permissions = Set.of(
        "android.permission.health.READ_EXERCISE",
        "android.permission.health.READ_DISTANCE"
    );

    permissionLauncher.launch(permissions);
    call.resolve();
}
    @PluginMethod
    public void ping(PluginCall call) {
        JSObject result = new JSObject();
        result.put("message", "Health Connect disponible");
        call.resolve(result);
    }

    @PluginMethod
    public void checkAvailability(PluginCall call) {
        int status = HealthConnectClient.getSdkStatus(getContext());

        JSObject result = new JSObject();
        result.put("available", status == HealthConnectClient.SDK_AVAILABLE);
        result.put("status", status);

        call.resolve(result);
    }
}