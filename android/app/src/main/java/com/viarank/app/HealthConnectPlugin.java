package com.viarank.app;

import androidx.health.connect.client.HealthConnectClient;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "HealthConnect")
public class HealthConnectPlugin extends Plugin {

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