package com.viarank.app;

import android.content.Intent;
import android.content.SharedPreferences;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ActivityTracking")
public class ActivityTrackingPlugin extends Plugin {

    @PluginMethod
    public void startTracking(PluginCall call) {
SharedPreferences storage =
        getContext().getSharedPreferences(
                "viarank_activity_tracking",
                android.content.Context.MODE_PRIVATE
        );

storage.edit().clear().apply();
        Intent intent = new Intent(getContext(), ActivityTrackingService.class);
        ContextCompat.startForegroundService(getContext(), intent);

        JSObject result = new JSObject();
        result.put("started", true);
        call.resolve(result);
    }

    @PluginMethod
public void stopTracking(PluginCall call) {
    SharedPreferences storage =
            getContext().getSharedPreferences(
                    "viarank_activity_tracking",
                    android.content.Context.MODE_PRIVATE
            );

    float distanciaMetros =
            storage.getFloat("distanciaMetros", 0f);

    long horaInicio =
            storage.getLong("horaInicio", 0L);

    long horaFin =
            System.currentTimeMillis();

    long duracionSegundos =
            horaInicio > 0
                    ? (horaFin - horaInicio) / 1000
                    : 0;

    Intent intent =
            new Intent(
                    getContext(),
                    ActivityTrackingService.class
            );

    boolean stopped =
            getContext().stopService(intent);

    JSObject result = new JSObject();
    result.put("stopped", stopped);
    result.put("distance", distanciaMetros);
    result.put("startTime", horaInicio);
    result.put("endTime", horaFin);
    result.put("duration", duracionSegundos);

    call.resolve(result);
}
@PluginMethod
public void getTrackingStatus(PluginCall call) {
    SharedPreferences storage =
            getContext().getSharedPreferences(
                    "viarank_activity_tracking",
                    android.content.Context.MODE_PRIVATE
            );

    float distanciaMetros =
            storage.getFloat("distanciaMetros", 0f);

    long horaInicio =
            storage.getLong("horaInicio", 0L);

    JSObject result = new JSObject();
    result.put("distance", distanciaMetros);
    result.put("startTime", horaInicio);

    call.resolve(result);
}
}
